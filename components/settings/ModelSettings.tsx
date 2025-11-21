import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const ModelSettings: React.FC = () => {
  const userSettings = useQuery(api.settings.getUserSettings);
  const availableModelsResult = useQuery(api.settings.getAvailableModelsQuery);
  const availableModels = availableModelsResult || [];
  const updateSettings = useMutation(api.settings.updateUserSettings);
  const testApiKey = useAction(api.ai.testOpenRouterKey);

  const [apiKey, setApiKey] = useState('');
  const [modelTaskClassification, setModelTaskClassification] = useState('');
  const [modelChat, setModelChat] = useState('');
  const [modelChatTitle, setModelChatTitle] = useState('');
  const [modelContentAnalysisText, setModelContentAnalysisText] = useState('');
  const [modelContentAnalysisImage, setModelContentAnalysisImage] = useState('');
  const [customModelTaskClassification, setCustomModelTaskClassification] = useState('');
  const [customModelChat, setCustomModelChat] = useState('');
  const [customModelChatTitle, setCustomModelChatTitle] = useState('');
  const [customModelContentAnalysisText, setCustomModelContentAnalysisText] = useState('');
  const [customModelContentAnalysisImage, setCustomModelContentAnalysisImage] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings when component mounts
  useEffect(() => {
    if (userSettings) {
      setApiKey(userSettings.openRouterApiKey || '');
      setModelTaskClassification(userSettings.modelTaskClassification || '');
      setModelChat(userSettings.modelChat || '');
      setModelChatTitle(userSettings.modelChatTitle || '');
      setModelContentAnalysisText(userSettings.modelContentAnalysisText || '');
      setModelContentAnalysisImage(userSettings.modelContentAnalysisImage || '');
    } else {
      // Reset to empty when no settings exist
      setApiKey('');
      setModelTaskClassification('');
      setModelChat('');
      setModelChatTitle('');
      setModelContentAnalysisText('');
      setModelContentAnalysisImage('');
    }
    setApiKeyStatus('idle');
  }, [userSettings]);

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyStatus('invalid');
      return;
    }

    setApiKeyStatus('testing');
    try {
      // Temporarily update settings to test the key
      await updateSettings({ openRouterApiKey: apiKey });
      // Wait a moment for the settings to be saved
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = await testApiKey();
      if (result && result.success) {
        setApiKeyStatus('valid');
      } else {
        setApiKeyStatus('invalid');
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setApiKeyStatus('invalid');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettings({
        openRouterApiKey: apiKey || undefined,
        modelTaskClassification: modelTaskClassification || customModelTaskClassification || undefined,
        modelChat: modelChat || customModelChat || undefined,
        modelChatTitle: modelChatTitle || customModelChatTitle || undefined,
        modelContentAnalysisText: modelContentAnalysisText || customModelContentAnalysisText || undefined,
        modelContentAnalysisImage: modelContentAnalysisImage || customModelContentAnalysisImage || undefined,
      });
      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderModelSelect = (
    value: string,
    customValue: string,
    onChange: (value: string) => void,
    onCustomChange: (value: string) => void,
    label: string,
    description: string
  ) => {
    const isCustom = value === 'custom';
    const displayValue = isCustom ? customValue : value;

    return (
      <div className="space-y-2">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <Select
          value={value || ''}
          onValueChange={(val) => {
            onChange(val);
            if (val !== 'custom') {
              onCustomChange('');
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            {availableModels.length > 0 ? (
              <>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      {model.pricing && (
                        <span className="text-xs text-gray-400 ml-3 font-normal">
                          {model.pricing}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom (enter model ID)</SelectItem>
              </>
            ) : (
              <div className="px-2 py-1.5 text-sm text-gray-500">Loading models...</div>
            )}
          </SelectContent>
        </Select>
        {isCustom && (
          <Input
            placeholder="e.g., anthropic/claude-3.5-sonnet"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            className="mt-2"
          />
        )}
        {displayValue && !isCustom && (
          <p className="text-xs text-gray-400 mt-1">
            Selected: {availableModels.find(m => m.id === displayValue)?.name || displayValue}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* API Key Section */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="apiKey" className="text-sm font-medium">
            OpenRouter API Key
          </Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Your API key from{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            id="apiKey"
            type="password"
            placeholder="sk-or-v1-..."
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setApiKeyStatus('idle');
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleTestApiKey}
            disabled={apiKeyStatus === 'testing'}
          >
            {apiKeyStatus === 'testing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : apiKeyStatus === 'valid' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : apiKeyStatus === 'invalid' ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : (
              'Test'
            )}
          </Button>
        </div>
        {apiKeyStatus === 'valid' && (
          <p className="text-xs text-green-600">API key is valid</p>
        )}
        {apiKeyStatus === 'invalid' && (
          <p className="text-xs text-red-600">API key is invalid or has insufficient credits</p>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-4">Model Selection</h3>
        <div className="space-y-4">
          {renderModelSelect(
            modelTaskClassification,
            customModelTaskClassification,
            setModelTaskClassification,
            setCustomModelTaskClassification,
            'Task Classification',
            'Used for parsing and extracting task information from user input'
          )}
          {renderModelSelect(
            modelChat,
            customModelChat,
            setModelChat,
            setCustomModelChat,
            'Chat',
            'Used for conversational chat in entries view'
          )}
          {renderModelSelect(
            modelChatTitle,
            customModelChatTitle,
            setModelChatTitle,
            setCustomModelChatTitle,
            'Chat Title Generation',
            'Used for generating titles for chat conversations'
          )}
          {renderModelSelect(
            modelContentAnalysisText,
            customModelContentAnalysisText,
            setModelContentAnalysisText,
            setCustomModelContentAnalysisText,
            'Content Analysis (Text/Links)',
            'Used for analyzing text content and web links'
          )}
          {renderModelSelect(
            modelContentAnalysisImage,
            customModelContentAnalysisImage,
            setModelContentAnalysisImage,
            setCustomModelContentAnalysisImage,
            'Content Analysis (Images)',
            'Used for analyzing images and visual content'
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        {saveSuccess && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Settings saved successfully
          </p>
        )}
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

