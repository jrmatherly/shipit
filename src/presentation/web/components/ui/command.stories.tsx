import type { Meta, StoryObj } from '@storybook/react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './command';

const meta = {
  title: 'Primitives/Command',
  component: Command,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandGroup>
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem>Profile</CommandItem>
          <CommandItem>Billing</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const WithSelectedItem: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandGroup>
          <CommandItem selected>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const Empty: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Search..." defaultValue="xyz no match" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
      </CommandList>
    </Command>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandGroup>
          <CommandItem>Available</CommandItem>
          <CommandItem disabled>Disabled option</CommandItem>
          <CommandItem>Also available</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
