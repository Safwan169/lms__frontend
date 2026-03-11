// src/components/ui/DialogExample.tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import React from "react";

export default function DialogExample() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="px-3 py-2 bg-slate-800 text-white rounded">Open Dialog</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed bg-white p-6 rounded shadow-md top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Dialog.Title className="text-lg font-medium">Dialog Title</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm">This is an example dialog.</Dialog.Description>
          <div className="mt-4 flex justify-end">
            <Dialog.Close className="px-3 py-1 bg-slate-200 rounded">Close</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
