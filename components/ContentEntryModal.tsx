import React, { useState } from 'react';
import { Entry } from '../types';
import { X, ExternalLink, Check, Edit2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface ContentEntryModalProps {
  entry: Entry;
  onClose: () => void;
  onUpdate?: (entry: Entry) => void;
}

export const ContentEntryModal: React.FC<ContentEntryModalProps> = ({
  entry,
  onClose,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClassification, setEditedClassification] = useState(entry.classification);
  const updateContentEntry = useMutation(api.entries.updateContentEntry);

  // Get image URL if this is an image content entry
  const imageUrl = entry.entryType === 'content' && entry.sourceImageId
    ? useQuery(api.entries.getImageUrl, { storageId: entry.sourceImageId as any })
    : undefined;

  const handleSave = async () => {
    if (editedClassification) {
      try {
        await updateContentEntry({
          id: entry.id as Id<"entries">,
          classification: editedClassification,
        });
        
        if (onUpdate) {
          onUpdate({
            ...entry,
            classification: editedClassification,
          });
        }
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update content entry:', error);
        alert('Failed to save changes. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setEditedClassification(entry.classification);
    setIsEditing(false);
  };

  const classification = isEditing ? editedClassification : entry.classification;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 pb-24 px-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-12rem)] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {classification?.category || entry.content}
            </h2>
            {entry.sourceUrl && (
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                title="Edit classification"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Source URL */}
          {entry.sourceUrl && (
            <div className="mb-4">
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {entry.sourceUrl}
              </a>
            </div>
          )}

          {/* Image thumbnail */}
          {imageUrl && (
            <div className="mb-4">
              <img
                src={imageUrl}
                alt={classification?.category || "Content image"}
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}

          {/* Analyzed content/summary */}
          {entry.analyzedContent && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Summary</h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {entry.analyzedContent}
              </p>
            </div>
          )}

          {/* Classification */}
          {classification && (
            <div className="space-y-4">
              {/* Category */}
              {isEditing ? (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
                  <input
                    type="text"
                    value={classification.category}
                    onChange={(e) => setEditedClassification({
                      ...classification,
                      category: e.target.value,
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Category</h3>
                  <p className="text-base text-gray-900">{classification.category}</p>
                </div>
              )}

              {/* Topics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Topics</h3>
                {isEditing ? (
                  <textarea
                    value={classification.topics.join(', ')}
                    onChange={(e) => setEditedClassification({
                      ...classification,
                      topics: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={2}
                    placeholder="Comma-separated topics"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classification.topics.length > 0 ? (
                      classification.topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                        >
                          {topic}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No topics</span>
                    )}
                  </div>
                )}
              </div>

              {/* Key Points */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Points</h3>
                {isEditing ? (
                  <textarea
                    value={classification.keyPoints.join('\n')}
                    onChange={(e) => setEditedClassification({
                      ...classification,
                      keyPoints: e.target.value.split('\n').filter(Boolean),
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={4}
                    placeholder="One point per line"
                  />
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {classification.keyPoints.length > 0 ? (
                      classification.keyPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))
                    ) : (
                      <li className="text-gray-400">No key points</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Lessons */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Lessons</h3>
                {isEditing ? (
                  <textarea
                    value={classification.lessons.join('\n')}
                    onChange={(e) => setEditedClassification({
                      ...classification,
                      lessons: e.target.value.split('\n').filter(Boolean),
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={4}
                    placeholder="One lesson per line"
                  />
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {classification.lessons.length > 0 ? (
                      classification.lessons.map((lesson, idx) => (
                        <li key={idx}>{lesson}</li>
                      ))
                    ) : (
                      <li className="text-gray-400">No lessons</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-50 bg-white/50 backdrop-blur-xl">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

