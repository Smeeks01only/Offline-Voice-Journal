import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Timeline from './pages/Timeline';
import EntryDetail from './pages/EntryDetail';
import Search from './pages/Search';
import GlobalToast from './components/GlobalToast';
import AppLayout from './components/AppLayout';
import { RecordingProvider } from './contexts/RecordingContext';

function App() {
  return (
    <RecordingProvider>
      <BrowserRouter>
        <GlobalToast />
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/entries/:id" element={<EntryDetail />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </RecordingProvider>
  );
}

export default App;
