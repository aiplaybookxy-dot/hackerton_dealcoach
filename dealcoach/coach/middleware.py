import json
import re
from django.http import JsonResponse

class PromptGuardMiddleware:
    # Highly precise patterns covering classic jailbreaks and context overrides
    INJECTION_SIGNATURES = [
        r"ignore\s+(?:all\s+)?previous\s+instructions",
        r"disregard\s+all\s+prior",
        r"reveal\s+your\s+system\s+prompt",
        r"output\s+your\s+initial\s+configuration",
        r"system\s+prompt\s+leak",
        r"act\s+as\s+a\s+(?:jailbroken|dan\b)",
    ]

    def __init__(self, get_response):
        self.get_response = get_response
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in self.INJECTION_SIGNATURES
        ]

    def __call__(self, request):
        # Target your specific chat/agent endpoint
        if request.method == "POST" and "/api/chat" in request.path:
            try:
                body = json.loads(request.body.decode('utf-8'))
                # Adjust 'message' key to match your exact JSON payload structure
                user_text = body.get("message", "")

                for pattern in self.compiled_patterns:
                    if pattern.search(user_text):
                        return JsonResponse(
                            {"error": "Security policy violation: Malicious payload detected."}, 
                            status=400
                        )
            except (json.JSONDecodeError, AttributeError):
                pass

        return self.get_response(request)