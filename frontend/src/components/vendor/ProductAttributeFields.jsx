import { getProductAttributeFields, formatProductAttributeLabel } from './productTemplates';

function FieldControl({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(event) => onChange(field.name, event.target.value)}
        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
      >
        <option value="">Select one</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value ?? ''}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        rows={field.rows || 3}
        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.name, event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-sage"
        />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      min={field.type === 'number' ? '0' : undefined}
      step={field.type === 'number' ? '1' : undefined}
      value={value ?? ''}
      onChange={(event) => onChange(field.name, event.target.value)}
      placeholder={field.placeholder}
      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
    />
  );
}

function ProductAttributeFields({ productType, attributes, onChange, className = '' }) {
  const fields = getProductAttributeFields(productType);

  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Product Specifications</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Add the details buyers expect on a professional storefront.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          if (field.type === 'checkbox') {
            return (
              <div key={field.name} className="md:col-span-1">
                <FieldControl field={field} value={attributes?.[field.name]} onChange={onChange} />
              </div>
            );
          }

          return (
            <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="mb-1 block text-sm font-semibold text-zinc-800">
                {field.label}
                {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
              </label>
              <FieldControl field={field} value={attributes?.[field.name]} onChange={onChange} />
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
        Use this section for size charts, ingredients, materials, shelf life, care notes, and other product-specific details.
      </div>
    </div>
  );
}

export default ProductAttributeFields;

export { formatProductAttributeLabel };