import { getDefaultVariantRows } from './productTemplates';

function ProductVariantsEditor({ productType, variants, onChange }) {
  const rows = Array.isArray(variants) ? variants : [];

  function updateRow(index, key, value) {
    const next = rows.map((row, currentIndex) => (
      currentIndex === index ? { ...row, [key]: value } : row
    ));
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

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Variants</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Add sizes, colors, flavors, or packs as separate sellable options.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={usePreset} className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700">
            Load preset
          </button>
          <button type="button" onClick={addRow} className="rounded-xl bg-sage px-3 py-2 text-xs font-semibold text-white">
            Add variant
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {rows.length > 0 ? rows.map((row, index) => (
          <div key={`${row.option_name || 'variant'}-${index}`} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-3 md:grid-cols-5">
            <input
              value={row.option_name || ''}
              onChange={(event) => updateRow(index, 'option_name', event.target.value)}
              placeholder="Option name"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={row.option_value || ''}
              onChange={(event) => updateRow(index, 'option_value', event.target.value)}
              placeholder="Option value"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={row.sku_suffix || ''}
              onChange={(event) => updateRow(index, 'sku_suffix', event.target.value)}
              placeholder="SKU suffix"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={row.additional_price ?? ''}
              onChange={(event) => updateRow(index, 'additional_price', event.target.value)}
              placeholder="Extra price"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={row.stock ?? ''}
                onChange={(event) => updateRow(index, 'stock', event.target.value)}
                placeholder="Stock"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                Remove
              </button>
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
