"use client";
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { createTask, database } from '../app/utils/firebaseConfig';
import { getDatabase, ref, onValue, set, push, onDisconnect } from 'firebase/database';

// Define types for the component state
type TaskStatus = 'pending' | 'completed' | 'failed';

export default function Home() {
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'upload'>('editor');
  const [isOnline, setIsOnline] = useState<boolean>(true); // Default to true
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    const presenceRef = ref(database, 'presence');
    const connectRef = ref(database, '.info/connected');

    // Create a new presence document and use its key as the clientId
    const newPresenceRef = push(presenceRef);
    setClientId(newPresenceRef.key as string);

    // Set the online presence data for this client
    set(newPresenceRef, {
      online: true,
      lastSeen: new Date().toISOString(),
    });

    const unsubscribe = onValue(connectRef, (snapshot) => {
      if (snapshot.val() === true) {
        console.log("Connected to Firebase");

        // Set up disconnect behavior to remove presence data when offline
        onDisconnect(newPresenceRef).remove();

        setIsOnline(true);
      } else {
        console.log("Disconnected from Firebase");
        setIsOnline(false);
      }
    });

    return () => {
      unsubscribe();
      set(newPresenceRef, {
        online: false,
        lastSeen: new Date().toISOString(),
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
    setOutput('Running code...\n');
    
    try {
      // Call Tauri command to run Python code
      const result = await invoke<string>('run_python_code', { code });
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${(error as Error).toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToDash = async () => {
    if (!code || !isOnline || !clientId) {
      setOutput('Error: Cannot send to DASH. Please check your connection and code.');
      return;
    }

    setIsLoading(true);
    setOutput('Sending to DASH...\n');
    
    try {
      // Create a new task in Firebase
      const taskId = await createTask(clientId, code);
      
      setOutput(`Function deployed to DASH successfully!\nTask ID: ${taskId}\nStatus: Pending`);
      
      // Optional: Set up a listener for this specific task
      const taskRef = ref(database, `tasks/${taskId}`);
      onValue(taskRef, (snapshot) => {
        const task = snapshot.val() as { status: TaskStatus; output?: string };
        if (task && task.status !== 'pending') {
          setOutput(`Task ${taskId}\nStatus: ${task.status}\n${task.output || ''}`);
        }
      });
      
    } catch (error) {
      setOutput(`Error sending to DASH: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full bg-white min-h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 p-4 space-y-4">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-blue-500 rounded-full" />
          <span className="text-xl font-semibold">DASH Console</span>
        </div>
        
        {/* Connection Status */}
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
          isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        
        <nav className="space-y-2">
          <button className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2">
            <span>Functions</span>
          </button>
          <button className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2">
            <span>Deployments</span>
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Function Editor</h2>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <div className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`pb-4 ${
                      activeTab === 'editor'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Code Editor
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`pb-4 ${
                      activeTab === 'upload'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Upload File
                  </button>
                </div>
              </div>

              {/* Editor */}
              {activeTab === 'editor' ? (
                <div className="mt-4">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-64 font-mono p-4 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50"
                    placeholder="# Type your Python code here...\n\nprint('Hello from DASH!')"
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <label className="block p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-gray-50">
                    <span className="mt-2 block text-sm font-medium text-gray-600">
                      Upload a Python file (.py)
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".py"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 space-x-4">
                <button
                  onClick={handleRunLocally}
                  disabled={isLoading || !code}
                  className="inline-flex items-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Locally
                </button>
                
                <button
                  onClick={handleSendToDash}
                  disabled={isLoading || !code || !isOnline}
                  className="inline-flex items-center px-4 py-2 text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send to DASH
                </button>
              </div>

              {/* Output */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Output</h3>
                <pre className="p-4 bg-gray-100 rounded-lg h-48 overflow-auto text-sm">{output}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
