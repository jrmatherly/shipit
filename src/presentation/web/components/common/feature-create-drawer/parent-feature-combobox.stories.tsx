import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ParentFeatureCombobox } from './parent-feature-combobox';
import type { ParentFeatureOption } from './types';

const SAMPLE_FEATURES: ParentFeatureOption[] = [
  { id: 'feat-001-abcdef12', name: 'OAuth integration' },
  { id: 'feat-002-defabc34', name: 'Dashboard redesign' },
  { id: 'feat-003-ghidef56', name: 'API rate limiting' },
  { id: 'feat-004-jklghi78', name: 'Mobile responsive layout' },
  { id: 'feat-005-mnojkl90', name: 'Dark mode support' },
];

const meta: Meta<typeof ParentFeatureCombobox> = {
  title: 'Drawers/Feature/ParentFeatureCombobox',
  component: ParentFeatureCombobox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ParentFeatureCombobox>;

function ParentFeatureComboboxWrapper({
  features,
  initialValue,
  disabled,
}: {
  features: ParentFeatureOption[];
  initialValue?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<string | undefined>(initialValue);

  return (
    <div className="w-80">
      <ParentFeatureCombobox
        features={features}
        value={value}
        onChange={setValue}
        disabled={disabled}
      />
      {value ? (
        <p className="text-muted-foreground mt-2 text-xs">Selected: {value}</p>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">No parent selected</p>
      )}
    </div>
  );
}

/** Default state with multiple features available for selection. */
export const WithFeatures: Story = {
  render: () => <ParentFeatureComboboxWrapper features={SAMPLE_FEATURES} />,
};

/** Pre-selected feature — trigger shows the feature name and short ID. */
export const PreSelected: Story = {
  render: () => (
    <ParentFeatureComboboxWrapper features={SAMPLE_FEATURES} initialValue="feat-002-defabc34" />
  ),
};

/** Empty features list — shows no items (only "No parent" option). */
export const EmptyList: Story = {
  render: () => <ParentFeatureComboboxWrapper features={[]} />,
};

/** Disabled state — trigger button is non-interactive. */
export const Disabled: Story = {
  render: () => <ParentFeatureComboboxWrapper features={SAMPLE_FEATURES} disabled />,
};
