import type en from "../../messages/en.json";

// Gives t("SomeKey") autocomplete and a compile error on a typo'd key,
// checked against the English catalog (the one that's always complete).
type Messages = typeof en;

// next-intl's own documented pattern for typed messages: augmenting the
// global IntlMessages interface requires an interface, not a type alias.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}
