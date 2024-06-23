import { Form } from "@remix-run/react";

export interface EventButtonProps {
  children: React.ReactNode;
  className?: string;
  event: string;
  payload?: Record<string, string>;
}

/**
 * HTML form that sends an event to the backend state machine
 * 
 * Example "back" event:
 * ```json
 * {
 *  "type": "back"
 * }
 * ```
 * 
 * Adapted from https://github.com/erikras/remix-conf-2022/blob/main/app/components/EventButton.jsx
 */
export function EventButton({ children, className, event, payload }: EventButtonProps) {
  return (
    <Form method="post" className="inline">
      {payload &&
        Object.keys(payload).length > 0 &&
        Object.entries(payload).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <input type="hidden" name="type" value={event} />
      <button type="submit" className={className}>
        {children}
      </button>
    </Form>
  );
}
