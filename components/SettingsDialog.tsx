import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { ModelSettings } from './settings/ModelSettings';
import { GeneralSettings } from './settings/GeneralSettings';

type SettingsTab = 'general' | 'models';

export const SettingsDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('models');

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'models', label: 'AI Models' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-[calc(100vw-4rem)] md:!w-[42rem]"
        style={{
          maxWidth: '42rem',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your application preferences and AI model settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Tabs Navigation */}
          <div className="flex gap-1 border-b mb-4 -mx-6 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 text-sm font-medium transition-colors relative
                  ${
                    activeTab === tab.id
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'models' && <ModelSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
