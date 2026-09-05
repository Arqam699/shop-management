import React from 'react';
import { Sparkles } from 'lucide-react';

const PlaceholderPage = ({ title }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-full">
        <Sparkles className="w-10 h-10 text-indigo-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">{title} Module</h3>
      <p className="text-sm text-gray-600 max-w-md">
        This database panel is scheduled. In subsequent execution phases, all inventory sheets, receipt tables, or profiles will build automatically into this screen.
      </p>
    </div>
  );
};

export default PlaceholderPage;