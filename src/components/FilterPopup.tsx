import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FilterPopupProps {
  column: string;
  anchorEl: HTMLElement;
  onClose: () => void;
  onApplyFilter: (filter: { value: string; operator: string }) => void;
  currentFilter?: { value: string; operator: string };
}

const FilterPopup: React.FC<FilterPopupProps> = ({
  column,
  anchorEl,
  onClose,
  onApplyFilter,
  currentFilter
}) => {
  const [value, setValue] = useState(currentFilter?.value || '');
  const [operator, setOperator] = useState(currentFilter?.operator || 'equals');

  const handleApply = () => {
    onApplyFilter({ value, operator });
    onClose();
  };

  const rect = anchorEl.getBoundingClientRect();

  return (
    <div 
      className="fixed z-50 mt-2 bg-white/10 backdrop-blur-xl rounded-lg border border-white/20 shadow-lg"
      style={{
        top: `${rect.bottom + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
      }}
    >
      <div className="p-4 min-w-[250px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-medium">Filter {column}</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Operator</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white
                        focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
              {column === 'Shares' && (
                <>
                  <option value="greater">Greater than</option>
                  <option value="less">Less than</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Value</label>
            <input
              type={column === 'Shares' ? 'number' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white
                        focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Enter value..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg
                        transition-colors duration-200"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPopup; 