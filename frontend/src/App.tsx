// import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TaskFlow from './pages/TaskFlow';
import Configuration from './pages/Configuration';
import History from './pages/History';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider locale={zhCN}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/task-flow" element={<TaskFlow />} />
              <Route path="/task/:taskId" element={<TaskFlow />} />
              <Route path="/task/:taskId/step/:stepId" element={<TaskFlow />} />
              <Route path="/flow" element={<TaskFlow />} />
              <Route path="/configuration" element={<Configuration />} />
              <Route path="/config" element={<Configuration />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </Layout>
        </Router>
      </ConfigProvider>
    </Provider>
  );
}

export default App; 