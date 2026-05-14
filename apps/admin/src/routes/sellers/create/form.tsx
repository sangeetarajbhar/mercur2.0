import { Hint, Label, clx } from "@medusajs/ui"
import React, { createContext, forwardRef, useContext, useId } from "react"
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form"

const Provider = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue)

const Field = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: ControllerProps<TFieldValues, TName>
) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const FormItemContext = createContext<{ id: string }>({ id: "" })

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  return {
    id: itemContext.id,
    formItemId: `${itemContext.id}-form-item`,
    formErrorMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState,
  }
}

const Item = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={clx("flex flex-col space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    )
  }
)
Item.displayName = "Form.Item"

const FieldLabel = forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<"label">
>(({ className, ...props }, ref) => {
  const { formItemId } = useFormField()
  return <Label ref={ref} htmlFor={formItemId} className={className} size="small" weight="plus" {...props} />
})
FieldLabel.displayName = "Form.Label"

const Control = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => {
    const { formItemId } = useFormField()
    return (
      <div ref={ref} id={formItemId} {...props}>
        {children}
      </div>
    )
  }
)
Control.displayName = "Form.Control"

const ErrorMessage = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formErrorMessageId } = useFormField()
    const msg = error ? String(error?.message) : children
    if (!msg || msg === "undefined") {
      return null
    }
    return (
      <Hint ref={ref} id={formErrorMessageId} variant="error" className={className} {...props}>
        {msg}
      </Hint>
    )
  }
)
ErrorMessage.displayName = "Form.ErrorMessage"

export const Form = Object.assign(Provider, {
  Item,
  Label: FieldLabel,
  Control,
  ErrorMessage,
  Field,
})

