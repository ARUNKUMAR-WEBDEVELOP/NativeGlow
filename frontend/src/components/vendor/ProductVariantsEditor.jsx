import { getClothingVariantRows, getDefaultVariantRows, getVariantPresetHelp } from './productTemplates';

function ProductVariantsEditor({ productType, variants, onChange, productAttributes }) {
  const rows = Array.isArray(variants) ? variants : [];
  const garmentType = String(productAttributes?.garment_type || '').trim();
  const targetAudience = String(productAttributes?.gender || '').trim();
  const clothingPresetRows = productType === 'clothing'
    ? getClothingVariantRows(targetAudience, garmentType).map((item) => ({
      ...item,
      sku_suffix: '',
      additional_price: '',
      stock: '',
    }))
    : [];

  function buildSkuSuffix(optionName, optionValue) {
    const name = String(optionName || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const value = String(optionValue || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    return [name, value].filter(Boolean).join('-').slice(0, 30);
  }

  function updateRow(index, key, value) {
    const next = rows.map((row, currentIndex) => {
      if (currentIndex !== index) {
        return row;
      }

      const updated = { ...row, [key]: value };
      if ((key === 'option_name' || key === 'option_value') && !String(row.sku_suffix || '').trim()) {
        updated.sku_suffix = buildSkuSuffix(
          key === 'option_name' ? value : updated.option_name,
          key === 'option_value' ? value : updated.option_value
        );
      }

      return updated;
    });
    onChange(next);
  }

  function addRow() {
    onChange([
      ...rows,
      {
        option_name: '',
        option_value: '',
        sku_suffix: '',
        additional_price: '',
        stock: '',
      },
    ]);
  }

  function removeRow(index) {
    const next = rows.filter((_, currentIndex) => currentIndex !== index);
    onChange(next);
  }

  function usePreset() {
    onChange(getDefaultVariantRows(productType));
  }

  function useClothingSelectionPreset() {
    if (clothingPresetRows.length === 0) {
      return;
    }
    onChange(clothingPresetRows);
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="max-w-xl">
          <div className="inline-flex items-center rounded-full bg-sage/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sage">
            Variant setup
          </div>
          <h3 className="mt-2 text-base font-semibold text-zinc-900">Variants</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {getVariantPresetHelp(productType)}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            SKU suffix is the variant code appended to your main SKU. Example: main SKU <strong>TSHIRT001</strong> + suffix <strong>SIZE-M-BLACK</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {productType === 'clothing' ? (
            <button
              type="button"
              onClick={useClothingSelectionPreset}
              disabled={clothingPresetRows.length === 0}
              className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              title={clothingPresetRows.length === 0 ? 'Select Target Audience and Garment Type first' : 'Load sizes based on selected audience and garment'}
            >
              Use Garment Options
            </button>
          ) : null}
          <button
            type="button"
            onClick={usePreset}
            className="rounded-2xl border border-black bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-900"
          >
            Load preset
          </button>
          <button
            type="button"
            onClick={addRow}
           className="rounded-2xl border border-black bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-900"
          >  Add variant
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {productType === 'clothing' && clothingPresetRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Select <strong>Target Audience</strong> and <strong>Garment Type</strong> in Product Specifications, then click <strong>Use Garment Options</strong> to auto-fill sizes.
          </div>
        ) : null}
        {rows.length > 0 ? rows.map((row, index) => (
          <div key={`${row.option_name || 'variant'}-${index}`} className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Variant #{index + 1}</p>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-600">Option Name</span>
                <input
                  value={row.option_name || ''}
                  onChange={(event) => updateRow(index, 'option_name', event.target.value)}
                  placeholder="Size / Color / Flavor"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-600">Option Value</span>
                <input
                  value={row.option_value || ''}
                  onChange={(event) => updateRow(index, 'option_value', event.target.value)}
                  placeholder="M / Black / Mango"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-600">SKU Suffix</span>
                <input
                  value={row.sku_suffix || ''}
                  onChange={(event) => updateRow(index, 'sku_suffix', event.target.value)}
                  placeholder="SIZE-M-BLACK"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-600">Extra Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.additional_price ?? ''}
                  onChange={(event) => updateRow(index, 'additional_price', event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-600">Stock Available</span>
                <input
                  type="number"
                  min="0"
                  value={row.stock ?? ''}
                  onChange={(event) => updateRow(index, 'stock', event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </label>
            </div>

          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-sm text-zinc-500">
            No variants added yet. Click Load preset or Add variant.
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductVariantsEditor;
