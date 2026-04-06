import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Settings } from 'lucide-react';
import {
  SettingsRow,
  SwitchRow,
  SettingsSection,
  NumberStepper,
  SubsectionLabel,
} from './settings-section-utils';

/**
 * settings-section-utils exports multiple reusable settings row components.
 * Stories demonstrate each component individually and in composition.
 */

function SettingsRowDemo() {
  return (
    <div className="w-96 rounded-lg border">
      <div className="px-4">
        <SettingsRow label="Enable notifications" htmlFor="notif">
          <input type="checkbox" id="notif" />
        </SettingsRow>
        <SettingsRow
          label="Dark mode"
          description="Use dark color scheme for the interface"
          htmlFor="dark"
        >
          <input type="checkbox" id="dark" />
        </SettingsRow>
        <SettingsRow label="Language">
          <span className="text-sm">English</span>
        </SettingsRow>
      </div>
    </div>
  );
}

function SwitchRowDemo() {
  return (
    <div className="w-96 rounded-lg border">
      <div className="px-4">
        <SwitchRow
          label="Auto-save"
          description="Automatically save changes"
          id="auto-save"
          testId="switch-auto-save"
          checked={true}
          onChange={fn()}
        />
        <SwitchRow
          label="Notifications"
          id="notifications"
          testId="switch-notifications"
          checked={false}
          onChange={fn()}
        />
        <SwitchRow
          label="Experimental features"
          description="Enable unstable features (may cause issues)"
          id="experimental"
          testId="switch-experimental"
          checked={false}
          onChange={fn()}
          disabled
        />
      </div>
    </div>
  );
}

function SettingsSectionDemo() {
  return (
    <div className="w-96">
      <SettingsSection
        icon={Settings}
        title="General Settings"
        description="Configure general application behavior"
        testId="general-settings"
        tooltip="Configure the agent model used for all AI-powered operations. Changes take effect on the next agent run."
        tooltipLinks={[
          { label: 'Documentation', href: 'https://docs.example.com' },
          { label: 'Getting started guide', href: 'https://docs.example.com/start' },
        ]}
      >
        <SwitchRow
          label="Show tooltips"
          id="tooltips"
          testId="switch-tooltips"
          checked={true}
          onChange={fn()}
        />
        <SwitchRow
          label="Compact mode"
          id="compact"
          testId="switch-compact"
          checked={false}
          onChange={fn()}
        />
      </SettingsSection>
    </div>
  );
}

function NumberStepperDemo() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <NumberStepper
        id="timeout"
        testId="stepper-timeout"
        value="30"
        onChange={fn()}
        onBlur={fn()}
        placeholder="30"
        min={1}
        max={300}
        suffix="seconds"
      />
      <NumberStepper
        id="retries"
        testId="stepper-retries"
        value="3"
        onChange={fn()}
        onBlur={fn()}
        placeholder="3"
        min={0}
        max={10}
      />
    </div>
  );
}

const meta = {
  title: 'Settings/SettingsSectionUtils',
  component: SettingsRowDemo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SettingsRowDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SettingsRowVariants: Story = {};

export const SwitchRows: Story = {
  render: () => <SwitchRowDemo />,
};

export const SectionWithSwitches: Story = {
  render: () => <SettingsSectionDemo />,
};

export const NumberSteppers: Story = {
  render: () => <NumberStepperDemo />,
};

export const SubsectionLabelExample: Story = {
  render: () => (
    <div className="w-80 rounded-lg border px-4">
      <SubsectionLabel>Advanced Options</SubsectionLabel>
      <div className="text-muted-foreground py-2 text-sm">Content below subsection label</div>
      <SubsectionLabel>Developer Options</SubsectionLabel>
      <div className="text-muted-foreground py-2 text-sm">More content here</div>
    </div>
  ),
};

export const SectionWithTooltip: Story = {
  render: () => <SettingsSectionDemo />,
};
