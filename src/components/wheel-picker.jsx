import "@ncdai/react-wheel-picker/style.css"

import * as WheelPickerPrimitive from "@ncdai/react-wheel-picker"

import { cn } from "@/lib/utils"

function WheelPickerWrapper({
  className,
  ...props
}) {
  return (
    <WheelPickerPrimitive.WheelPickerWrapper
      className={cn(
        "w-full rounded-xl px-1",
        "*:data-rwp:first:*:data-rwp-highlight-wrapper:rounded-s-md",
        "*:data-rwp:last:*:data-rwp-highlight-wrapper:rounded-e-md",
        className
      )}
      {...props} />
  );
}

function WheelPicker(
  {
    classNames,
    ...props
  }
) {
  return (
    <WheelPickerPrimitive.WheelPicker
      classNames={{
        optionItem: cn(
          "text-gray-400 data-disabled:opacity-40",
          classNames?.optionItem
        ),
        highlightWrapper: cn(
          "text-gray-800",
          "data-rwp-focused:ring-2 data-rwp-focused:ring-accent-mint/30 data-rwp-focused:ring-inset",
          classNames?.highlightWrapper
        ),
        highlightItem: cn("data-disabled:opacity-40", classNames?.highlightItem),
      }}
      {...props} />
  );
}

export { WheelPicker, WheelPickerWrapper }
