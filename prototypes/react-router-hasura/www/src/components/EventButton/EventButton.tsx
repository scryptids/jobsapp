import { Form } from "react-router";

export interface EventButtonProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly event: string;
  readonly payload?: Record<string, string>;
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
export function EventButton({
  children,
  className = undefined,
  event,
  payload = undefined,
}: EventButtonProps) {
  return (
    <Form method="post" className="inline">
      {payload
        ? Object.entries(payload).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))
        : null}
      <input type="hidden" name="type" value={event} />
      <button type="submit" className={className}>
        {children}
      </button>
    </Form>
  );
}
