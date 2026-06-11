from django.http import JsonResponse
from django.http import StreamingHttpResponse  # ⚡ CRITICAL IMPORT
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import os
from openai import OpenAI
from dotenv import load_dotenv
from .models import UserMemory, GameSession

load_dotenv()

# ALIBABA CLOUD MODEL STUDIO REGIONAL MIGRATION
WORKSPACE_ID = os.getenv("QWEN_WORKSPACE_ID")
BASE_URL_SINGAPORE = f"https://{WORKSPACE_ID}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"

client = OpenAI(
    base_url=BASE_URL_SINGAPORE,
    api_key=os.getenv("DASHSCOPE_API_KEY"),
)

# Switch to the official flagship reasoning model recommended for complex tasks
MODEL_NAME = "qwen3.7-max"

SCENARIO_PROMPTS = {
    'vc': "You are Maria, a direct VC investor. Keep responses concise (1-2 sentences). Ask tough questions.",
    'journalist': "You are Sarah, a persistent investigative journalist. Keep responses concise (1-2 sentences).",
    'politician': "You are Congressman James, conducting a tight hearing. Keep responses concise (1-2 sentences).",
    'ceo': "You are Jonathan, an analytical board director. Keep responses concise (1-2 sentences)."
}

EVALUATION_PROMPT = """
You are an expert executive coach. Analyze the pitch transcript between the User and the AI adversary.
Rate the user out of 100 overall and provide a strict breakdown.
You must return your response STRICTLY as a valid JSON object matching this structure:
{
    "score": 85,
    "breakdown": {"confidence": 90, "objection_handling": 75, "clarity": 90},
    "critical_mistake": "A summary of their absolute biggest error where they lost leverage.",
    "actionable_tips": ["Tip 1", "Tip 2"]
}
"""

MEMORY_CONSOLIDATION_PROMPT = """
You are an advanced memory agent. Your task is to update a user's "Vulnerability Profile" by merging their historical flaws with their newest mistake.

CRITICAL RULES:
1. If the Current Profile is empty, default or blank, construct the profile based ONLY on the Latest Session Mistake. 
2. RETAIN highly specific, raw evidence from the provided inputs.
3. DO NOT invent, hallucinate, or fabricate fake business ideas, fake arguments, or fictional past scenarios if they are not explicitly present in the text below.

Current Profile: {old_profile}
Latest Session Mistake: {new_mistake}

Return only the updated paragraph profile. Keep it under 4 sentences. Be direct, brutal, and concrete. Do not include introductory text or meta-commentary.
"""

@csrf_exempt
@require_http_methods(["POST"])
def chat(request):
    try:
        data = json.loads(request.body)
        history = data.get('history', [])
        scenario = data.get('scenario', 'vc')
        file_context = data.get('file_context', None)

        if not history:
            return JsonResponse({'error': 'No conversation history provided'}, status=400)

        profile, _ = UserMemory.objects.get_or_create(user_id="default_user")
        
        print("\n" + "="*50)
        print(f"🔮 [QWEN CLOUD STREAM] ACTIVE CONTEXT ATTACK PATH: {scenario.upper()}")
        print("="*50 + "\n")
        
        base_prompt = SCENARIO_PROMPTS.get(scenario, SCENARIO_PROMPTS['vc'])
        is_first_turn = len(history) <= 1
        
        if is_first_turn:
            memory_instruction = (
                f"\n\n[CRITICAL TRACK 1 DIRECTIVE]: You have access to the user's cross-session execution record: '{profile.vulnerability_profile}'. "
                "Because this is the very opening exchange of a cross-session interaction, you MUST immediately formulate your opening question or statement "
                "to explicitly reference or attack a vulnerability or past business failure detailed in that profile. Do not give a generic welcome or greeting."
            )
        else:
            memory_instruction = f"\n\n[TARGET USER VULNERABILITY ARCHIVE]: Use this information to guide your continuous pressure: {profile.vulnerability_profile}"

        adaptive_system_prompt = f"{base_prompt}{memory_instruction}\n\n"

        if file_context:
            adaptive_system_prompt += f"[CONTEXT FILE]:\n{file_context}\n"

        api_messages = [{"role": "system", "content": adaptive_system_prompt}]
        for msg in history:
            api_messages.append({"role": msg.get('role'), "content": msg.get('content')})

        # ⚡ GENERATOR LAYER: Stream tokens directly out of the Qwen Cloud Core
        def stream_generator():
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=api_messages,
                temperature=0.7,
                max_tokens=150,
                stream=True  # Instructs Alibaba Cloud to send text word-by-word
            )
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        # Pipe the generator straight to the public internet network socket
        response = StreamingHttpResponse(stream_generator(), content_type='text/event-stream')
        response['X-Accel-Buffering'] = 'no'  # Prevents Nginx/proxy servers from buffering chunks
        return response

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def evaluate_session(request):
    try:
        data = json.loads(request.body)
        history = data.get('history', [])
        scenario = data.get('scenario', 'vc')

        if not history or len(history) < 2:
            return JsonResponse({'error': 'Insufficient dialogue turns.'}, status=400)

        transcript = ""
        for msg in history:
            role = "USER" if msg.get('role') == 'user' else "ADVERSARY"
            transcript += f"{role}: {msg.get('content')}\n\n"

        eval_res = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": EVALUATION_PROMPT},
                {"role": "user", "content": f"Transcript:\n{transcript}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        eval_data = json.loads(eval_res.choices[0].message.content)

        profile, _ = UserMemory.objects.get_or_create(user_id="default_user")
        GameSession.objects.create(
            memory_profile=profile,
            scenario=scenario,
            score=eval_data.get('score', 0),
            critical_mistake=eval_data.get('critical_mistake', '')
        )

        print("\n" + "📝"*20)
        print(f"NEW CRITICAL MISTAKE CAPTURED BY QWEN: {eval_data.get('critical_mistake')}")

        memory_update_res = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user", 
                    "content": MEMORY_CONSOLIDATION_PROMPT.format(
                        old_profile=profile.vulnerability_profile,
                        new_mistake=eval_data.get('critical_mistake', '')
                    )
                }
            ],
            temperature=0.3
        )
        
        profile.vulnerability_profile = memory_update_res.choices[0].message.content.strip()
        profile.save()

        print(f"💾 PERSISTED LONG-TERM AGENT PROFILING: {profile.vulnerability_profile}")
        print("📝"*20 + "\n")

        return JsonResponse(eval_data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    

@csrf_exempt
@require_http_methods(["POST"])
def reset_memory(request):
    try:
        profile, created = UserMemory.objects.get_or_create(user_id="default_user")
        profile.vulnerability_profile = "" 
        profile.save()
        
        GameSession.objects.filter(memory_profile=profile).delete()
        
        print("\n" + "🧹"*20)
        print("DATABASE PURGED VIA CLIENT INTERFACE UI")
        print("🧹"*20 + "\n")
        
        return JsonResponse({'status': 'success', 'message': 'Memory wiped successfully.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)