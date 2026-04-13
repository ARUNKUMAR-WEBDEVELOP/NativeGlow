import { useMemo, useState } from 'react';
import { getCategoryColorOptions, getCategorySizeOptions } from './productTemplates';

function normalizeOptionValue(option) {
  if (typeof option === 'string') {
    return { value: option, image_positions: [] };
  }
  if (option && typeof option === 'object') {
    return {
      value: String(option.value || option.label || option.name || '').trim(),
      image_positions: Array.isArray(option.image_positions)
        ? option.image_positions.map((position) => Number(position)).filter((position) => Number.isInteger(position) && position > 0)
        : [],
    };
  }
  return { value: '', image_positions: [] };
}

function VariantBadgeList({ options, onRemove, onToggleImagePosition, readOnly = false, showImageSlots = false, title = '' }) {
  if (!options || options.length === 0) {
    return <p className="text-sm text-zinc-500">No options selected yet</p>;
  }

  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const normalized = normalizeOptionValue(option);
        return (
          <div key={`${title}-${index}`} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                <span>{normalized.value}</span>
                {!readOnly && (
                  <button
                    onClick={() => onRemove(index)}
                    className="text-emerald-600 hover:text-emerald-800"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {showImageSlots ? (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="mb-2 text-xs font-medium text-zinc-600">Image slots for this color</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((position) => {
                    const selected = normalized.image_positions.includes(position);
                    return (
                      <button
                        key={`${title}-${index}-${position}`}
                        type="button"
                        onClick={() => onToggleImagePosition(index, position)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                          selected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-zinc-300 bg-white text-zinc-700 hover:border-indigo-400 hover:text-indigo-700'
                        }`}
                      >
                        Image {position}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AvailableOptionsList({ availableOptions, selectedOptions, onAdd }) {
  const selectedValues = selectedOptions.map((option) => normalizeOptionValue(option).value);
  const unselectedOptions = availableOptions.filter((opt) => !selectedValues.includes(String(opt)));

  if (unselectedOptions.length === 0) {
    return <p className="text-xs text-zinc-500">All options selected</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {unselectedOptions.map((option) => (
        <button
          key={option}
          onClick={() => onAdd(option)}
          type="button"
          className="rounded-lg border border-dashed border-zinc-300 px-3 py-1 text-sm hover:border-emerald-400 hover:bg-emerald-50"
        >
          + {option}
        </button>
      ))}
    </div>
  );
}

export default function ProductVariantOptionsEditor({
  categoryType,
  colorOptions = [],
  sizeOptions = [],
  onColorOptionsChange,
  onSizeOptionsChange,
}) {
  const availableColors = getCategoryColorOptions(categoryType);
  const availableSizes = getCategorySizeOptions(categoryType);
  const [customColor, setCustomColor] = useState('');
  const [customSize, setCustomSize] = useState('');

  const normalizedColorOptions = useMemo(
    () => colorOptions.map((option) => normalizeOptionValue(option)).filter((option) => option.value),
    [colorOptions]
  );

  const handleAddColor = (color) => {
    if (!normalizedColorOptions.some((option) => option.value === color)) {
      onColorOptionsChange([...normalizedColorOptions, { value: color, image_positions: [] }]);
    }
  };

  const handleRemoveColor = (index) => {
    onColorOptionsChange(normalizedColorOptions.filter((_, i) => i !== index));
  };

  const toggleColorImagePosition = (index, position) => {
    const next = normalizedColorOptions.map((option, optionIndex) => {
      if (optionIndex !== index) {
        return option;
      }
      const current = Array.isArray(option.image_positions) ? option.image_positions : [];
      const hasPosition = current.includes(position);
      const image_positions = hasPosition
        ? current.filter((item) => item !== position)
        : [...current, position].sort((a, b) => a - b);
      return { ...option, image_positions };
    });
    onColorOptionsChange(next);
  };

  const handleAddCustomColor = () => {
    if (customColor.trim() && !normalizedColorOptions.some((option) => option.value === customColor.trim())) {
      onColorOptionsChange([...normalizedColorOptions, { value: customColor.trim(), image_positions: [] }]);
      setCustomColor('');
    }
  };

  const handleAddSize = (size) => {
    if (!sizeOptions.includes(size)) {
      onSizeOptionsChange([...sizeOptions, size]);
    }
  };

  const handleRemoveSize = (index) => {
    onSizeOptionsChange(sizeOptions.filter((_, i) => i !== index));
  };

  const handleAddCustomSize = () => {
    if (customSize.trim() && !sizeOptions.includes(customSize.trim())) {
      onSizeOptionsChange([...sizeOptions, customSize.trim()]);
      setCustomSize('');
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Product Color Options
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          Select available colors like Amazon/Flipkart - customers can choose their preferred color
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Selected Colors</label>
          <VariantBadgeList
            title="color"
            options={normalizedColorOptions}
            onRemove={handleRemoveColor}
            onToggleImagePosition={toggleColorImagePosition}
            showImageSlots
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Quick Add from Suggestions</label>
          <AvailableOptionsList
            availableOptions={availableColors}
            selectedOptions={normalizedColorOptions}
            onAdd={handleAddColor}
          />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomColor()}
            placeholder="Add custom color..."
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddCustomColor}
            type="button"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Add
          </button>
        </div>
      </div>

      <hr className="border-zinc-300" />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Product Size Options
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          Select available sizes based on your product category - customers can choose their size
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Selected Sizes</label>
          <VariantBadgeList
            options={sizeOptions}
            onRemove={handleRemoveSize}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Quick Add from Suggestions</label>
          <div className="rounded-lg bg-white p-3">
            <p className="mb-2 text-xs font-medium text-zinc-600">
              Category: <span className="text-emerald-700 font-semibold">{categoryType}</span>
            </p>
            <AvailableOptionsList
              availableOptions={availableSizes}
              selectedOptions={sizeOptions}
              onAdd={handleAddSize}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSize()}
            placeholder="Add custom size (e.g., XXL, 44, etc.)..."
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddCustomSize}
            type="button"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 text-xs text-zinc-600">
        <p className="font-medium text-zinc-700">💡 Pro Tips:</p>
        <ul className="mt-2 list-inside space-y-1">
          <li>• For <strong>men's clothing</strong>: Use letter sizes (S, M, L, XL) or numeric sizes (28-42 for pants)</li>
          <li>• For <strong>women's clothing</strong>: Use letter sizes (XS, S, M, L, XL)</li>
          <li>• For <strong>skincare/beauty</strong>: Use volume sizes (30ml, 50ml, 100ml)</li>
          <li>• For <strong>food/groceries</strong>: Use weight sizes (250g, 500g, 1kg)</li>
          <li>• Customers will see these options on the product page to choose their preferred variant</li>
        </ul>
      </div>
    </div>
  );
}
