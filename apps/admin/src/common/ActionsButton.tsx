import { EllipsisHorizontal } from "@medusajs/icons";
import { Button, DropdownMenu } from "@medusajs/ui";
import { MouseEvent, ReactNode, useState } from "react";

type ActionItem = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
};

type ActionsButtonProps = {
  actions: ActionItem[];
};

export const ActionsButton = ({ actions }: ActionsButtonProps) => {
  const [open, setOpen] = useState(false);

  const handleActionClick = (event: MouseEvent, onClick: () => void) => {
    event.stopPropagation();
    onClick();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="transparent"
          className="h-8 w-12 p-0"
          onClick={(event) => event.stopPropagation()}
        >
          <EllipsisHorizontal />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {actions.map(({ label, onClick, icon }) => (
          <DropdownMenu.Item
            key={label}
            onClick={(event) => handleActionClick(event, onClick)}
            className="flex items-center gap-2"
          >
            {icon}
            {label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
