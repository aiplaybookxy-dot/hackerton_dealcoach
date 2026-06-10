from django.db import models

class UserMemory(models.Model):
    # Tracks the user's overall profile across multi-turn, cross-session runs
    user_id = models.CharField(max_length=100, default="default_user", unique=True)
    vulnerability_profile = models.TextField(
        default="User is a new recruit. No history recorded yet. Test their baseline confidence and structure."
    )
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Memory for {self.user_id}"

class GameSession(models.Model):
    # Logs individual interactive runs to track progression over time
    memory_profile = models.ForeignKey(UserMemory, on_delete=models.CASCADE, related_name="sessions")
    scenario = models.CharField(max_length=50)
    score = models.IntegerField()
    critical_mistake = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.scenario.upper()} Session - Score: {self.score}"