"use client";
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { createTask, database } from '@/app/utils/firebaseConfig';
import { ref, onValue, set, push, onDisconnect } from 'firebase/database';
import { Terminal, Code2, Upload, Network, Activity, PlayCircle } from 'lucide-react';

// Nord theme colors
const nordColors = {
  polar1: '#2E3440',
  polar2: '#3B4252',
  polar3: '#434C5E',
  polar4: '#4C566A',
  snow1: '#D8DEE9',
  snow2: '#E5E9F0',
  snow3: '#ECEFF4',
  frost1: '#8FBCBB',
  frost2: '#88C0D0',
  frost3: '#81A1C1',
  frost4: '#5E81AC',
  aurora1: '#BF616A', // red
  aurora2: '#D08770', // orange
  aurora3: '#EBCB8B', // yellow
  aurora4: '#A3BE8C', // green
  aurora5: '#B48EAD'  // purple
};

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'idle';
type NodeStatus = 'online' | 'busy' | 'idle' | 'offline';

interface Task {
  id: string;
  code: string;
  status: TaskStatus;
  output?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'upload'>('editor');
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>('idle');
  const [clientId, setClientId] = useState<string>('');
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [networkNodes, setNetworkNodes] = useState<number>(0);

  useEffect(() => {
    const presenceRef = ref(database, 'presence');
    const connectRef = ref(database, '.info/connected');
    const tasksRef = ref(database, 'tasks');

    // Initialize presence
    const newPresenceRef = push(presenceRef);
    const clientIdValue = newPresenceRef.key as string;
    setClientId(clientIdValue);

    // Set initial presence
    set(newPresenceRef, {
      status: 'idle',
      lastSeen: new Date().toISOString(),
      type: 'worker',
      capabilities: ['python']
    });

    // Monitor connection status
    const unsubscribeConnect = onValue(connectRef, (snapshot) => {
      if (snapshot.val() === true) {
        onDisconnect(newPresenceRef).remove();
        setNodeStatus('idle');
      } else {
        setNodeStatus('offline');
      }
    });

    // Monitor network nodes
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
      const nodes = snapshot.val();
      setNetworkNodes(nodes ? Object.keys(nodes).length : 0);
    });

    // Monitor recent tasks
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      const tasks = snapshot.val();
      if (tasks) {
        const tasksList = Object.entries(tasks).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
        setRecentTasks(tasksList);
      }
    });

    // Cleanup
    return () => {
      unsubscribeConnect();
      unsubscribePresence();
      unsubscribeTasks();
      set(newPresenceRef, {
        status: 'offline',
        lastSeen: new Date().toISOString()
      });
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      setCode(text);
    }
  };

  const handleRunLocally = async () => {
    setIsLoading(true);
    setOutput('Running code locally...\n');
    setNodeStatus('busy');
    
    try {
      const result = await invoke<string>('run_python_code', { code });
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${(error as Error).toString()}`);
    } finally {
      setIsLoading(false);
      setNodeStatus('idle');
    }
  };

  const handleSendToDash = async () => {
    if (!code || nodeStatus === 'offline' || !clientId) {
      setOutput('Error: Cannot send to DASH. Please check your connection and code.');
      return;
    }

    setIsLoading(true);
    setOutput('Distributing to DASH network...\n');
    
    try {
      const taskId = await createTask(clientId, code);
      setOutput(`Task distributed to DASH network!\nTask ID: ${taskId}\nStatus: Pending\nWaiting for available worker...`);
      
      const taskRef = ref(database, `tasks/${taskId}`);
      onValue(taskRef, (snapshot) => {
        const task = snapshot.val();
        if (task && task.status !== 'pending') {
          setOutput(`Task ${taskId}\nStatus: ${task.status}\nWorker: ${task.workerId || 'Unknown'}\n${task.output || ''}`);
        }
      });
    } catch (error) {
      setOutput(`Error distributing task: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: NodeStatus) => {
    switch (status) {
      case 'online': return nordColors.aurora4;
      case 'busy': return nordColors.aurora3;
      case 'idle': return nordColors.frost2;
      case 'offline': return nordColors.aurora1;
    }
  };

  return (
    <div className="flex w-full min-h-screen" style={{ backgroundColor: nordColors.polar1, color: nordColors.snow1 }}>
      {/* Sidebar */}
      <div className="w-72 border-r" style={{ borderColor: nordColors.polar3 }}>
        <div className="p-6 space-y-6">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Network size={24} className="text-frost2" style={{ color: nordColors.frost2 }} />
            <span className="text-xl font-semibold">DASH Network</span>
          </div>

          {/* Status Section */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: nordColors.polar2 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Node Status</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(nodeStatus) }} />
                  <span className="text-sm capitalize">{nodeStatus}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm">Network Nodes</span>
                <span className="text-sm font-medium">{networkNodes}</span>
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Recent Tasks</h3>
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg"
                style={{ backgroundColor: nordColors.polar2 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs truncate">{task.id}</span>
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: task.status === 'completed' ? nordColors.aurora4 
                        : task.status === 'failed' ? nordColors.aurora1
                        : task.status === 'running' ? nordColors.frost2
                        : nordColors.polar4
                    }}
                  >
                    {task.status}
                  </span>
                </div>
                <div className="text-xs opacity-60">{new Date(task.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Editor Section */}
          <div className="rounded-lg" style={{ backgroundColor: nordColors.polar2 }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Function Editor</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`p-2 rounded-lg flex items-center space-x-2 ${
                      activeTab === 'editor' ? 'text-frost2' : 'text-snow1 opacity-60'
                    }`}
                    style={{ backgroundColor: activeTab === 'editor' ? nordColors.polar3 : 'transparent' }}
                  >
                    <Code2 size={18} />
                    <span>Editor</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`p-2 rounded-lg flex items-center space-x-2 ${
                      activeTab === 'upload' ? 'text-frost2' : 'text-snow1 opacity-60'
                    }`}
                    style={{ backgroundColor: activeTab === 'upload' ? nordColors.polar3 : 'transparent' }}
                  >
                    <Upload size={18} />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-64 font-mono text-sm p-4 rounded-lg resize-none"
                  style={{ 
                    backgroundColor: nordColors.polar1,
                    color: nordColors.snow1,
                    border: `1px solid ${nordColors.polar4}`
                  }}
                  placeholder="# Type your Python code here..."
                />
              ) : (
                <label 
                  className="block p-8 rounded-lg cursor-pointer text-center"
                  style={{ 
                    border: `2px dashed ${nordColors.polar4}`,
                    backgroundColor: nordColors.polar1
                  }}
                >
                  <Upload size={24} className="mx-auto mb-2" style={{ color: nordColors.frost2 }} />
                  <span className="block text-sm">Upload Python File (.py)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".py"
                    onChange={handleFileUpload}
                  />
                </label>
              )}

              {/* Actions */}
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={handleRunLocally}
                  disabled={isLoading || !code}
                  className="px-4 py-2 rounded-lg flex items-center space-x-2"
                  style={{ 
                    backgroundColor: nordColors.frost4,
                    opacity: isLoading || !code ? 0.5 : 1
                  }}
                >
                  <PlayCircle size={18} />
                  <span>Run Locally</span>
                </button>
                
                <button
                  onClick={handleSendToDash}
                  disabled={isLoading || !code || nodeStatus === 'offline'}
                  className="px-4 py-2 rounded-lg flex items-center space-x-2"
                  style={{ 
                    backgroundColor: nordColors.aurora4,
                    opacity: isLoading || !code || nodeStatus === 'offline' ? 0.5 : 1
                  }}
                >
                  <Network size={18} />
                  <span>Distribute to Network</span>
                </button>
              </div>

              {/* Output */}
              <div className="mt-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Terminal size={18} style={{ color: nordColors.frost2 }} />
                  <h3 className="text-lg font-medium">Output</h3>
                </div>
                <pre 
                  className="p-4 rounded-lg h-48 overflow-auto text-sm"
                  style={{ 
                    backgroundColor: nordColors.polar1,
                    color: nordColors.snow1
                  }}
                >
                  {output}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}