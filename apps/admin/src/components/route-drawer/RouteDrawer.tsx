import { Drawer } from "@medusajs/ui";
import { ReactNode } from "react";

type RouteDrawerProps = {
  children: ReactNode;
  onClose: (open: boolean) => void;
  header?: string;
};

export const RouteDrawer = ({ children, onClose, header = "" }: RouteDrawerProps) => {
  return (
    <Drawer open={true} onOpenChange={onClose}>
      <Drawer.Content className="!right-0 !w-1/3">
        <Drawer.Header>
          <Drawer.Title>{header}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="h-full overflow-y-auto">
          <div className="flex flex-col gap-4 px-4">{children}</div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  );
};
