from django.urls import path
from .views import EntryListCreateView, EntryDetailView, SearchEntriesView

urlpatterns = [
    path('entries/', EntryListCreateView.as_view(), name='entry-list-create'),
    path('entries/<int:pk>/', EntryDetailView.as_view(), name='entry-detail'),
    path('search/', SearchEntriesView.as_view(), name='entry-search'),
]
