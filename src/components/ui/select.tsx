"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  isValidElement,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useFormFieldContext } from "./form-field";

const EMPTY_OPTION_VALUE = "__ontix_empty_select_option__";

type OptionProps = {
  value?: string | number;
  disabled?: boolean;
  children?: ReactNode;
};
type SelectValue = string | number;

export type SelectProps = Omit<
  ComponentProps<typeof SelectPrimitive.Trigger>,
  "children" | "value"
> & {
  children?: ReactNode;
  value?: SelectValue | null;
  defaultValue?: SelectValue;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  required?: boolean;
  form?: string;
};

export function Select({
  children,
  className,
  id,
  name,
  form,
  required,
  disabled,
  value,
  defaultValue,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...triggerProps
}: SelectProps) {
  const field = useFormFieldContext();
  const ariaDescribedBy =
    [describedBy, field?.describedBy].filter(Boolean).join(" ") || undefined;
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const option = child as React.ReactElement<OptionProps>;
    return [
      {
        key: option.key,
        value: String(
          option.props.value ?? getOptionText(option.props.children),
        ),
        disabled: Boolean(option.props.disabled),
        label: option.props.children,
      },
    ];
  });
  const normalizeValue = (optionValue: SelectValue | null | undefined) => {
    if (optionValue === undefined) return undefined;
    const stringValue = String(optionValue);
    return stringValue === "" ? EMPTY_OPTION_VALUE : stringValue;
  };
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    () =>
      normalizeValue(defaultValue ?? options[0]?.value ?? "") ??
      EMPTY_OPTION_VALUE,
  );
  const rootValue = isControlled
    ? (normalizeValue(value ?? "") ?? EMPTY_OPTION_VALUE)
    : uncontrolledValue;
  const nativeValue = rootValue === EMPTY_OPTION_VALUE ? "" : rootValue;

  function handleValueChange(nextValue: string) {
    const nextNativeValue = nextValue === EMPTY_OPTION_VALUE ? "" : nextValue;
    if (!isControlled) setUncontrolledValue(nextValue);
    if (!onChange) return;
    const target = {
      value: nextNativeValue,
      name: name ?? "",
    } as HTMLSelectElement;
    onChange({
      target,
      currentTarget: target,
    } as ChangeEvent<HTMLSelectElement>);
  }

  return (
    <>
      {name && (
        <input
          type="hidden"
          name={name}
          form={form}
          value={nativeValue}
          disabled={disabled}
        />
      )}
      <SelectPrimitive.Root
        value={rootValue}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          {...triggerProps}
          id={id ?? field?.controlId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid ?? (field?.invalid || undefined)}
          aria-required={required ?? (field?.required || undefined)}
          className={[
            "ui-select min-h-10 w-full rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error",
            field?.invalid && "ui-select--error",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon
            className="ui-select__trigger-icon"
            aria-hidden="true"
          >
            <ChevronDown size={15} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="ui-select__content"
            position="popper"
            sideOffset={5}
          >
            <SelectPrimitive.Viewport className="ui-select__viewport">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.key}
                  value={option.value || EMPTY_OPTION_VALUE}
                  disabled={option.disabled}
                  className="ui-select__item"
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="ui-select__item-indicator">
                    <Check size={14} aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </>
  );
}

function getOptionText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      if (isValidElement(child))
        return getOptionText(
          (child.props as { children?: ReactNode }).children,
        );
      return "";
    })
    .join("");
}
