import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FilterGroup, TAG_CATEGORIES } from '../constants';

interface FilterGroupCreatorProps {
  onSave: (group: FilterGroup) => void;
  onCancel: () => void;
}

export const FilterGroupCreator: React.FC<FilterGroupCreatorProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'headspace' | 'energy' | 'duration' | 'domains'>('domains');

  const handleSave = () => {
    if (name.trim()) {
      onSave({
        id: `custom-${Date.now()}`,
        name: name.trim(),
        category,
      });
      setName('');
      setCategory('domains');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Create Filter Group</h3>
          <button 
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekend Vibes"
              className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm text-gray-900 border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm text-gray-900 border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="headspace">Headspace</option>
              <option value="energy">Energy</option>
              <option value="duration">Duration</option>
              <option value="domains">Domains</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This group will show tags from the {category} category
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

