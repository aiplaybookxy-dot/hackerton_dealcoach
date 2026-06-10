from django.urls import path
from . import views

urlpatterns = [
    path('chat', views.chat, name='chat'),
    path('evaluate', views.evaluate_session, name='evaluate_session'),
    path('reset-memory', views.reset_memory, name='reset_memory'),
]