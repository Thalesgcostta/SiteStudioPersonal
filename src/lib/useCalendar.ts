import { useSyncExternalStore } from "react";
import { calendarSnapshot, subscribeCalendar } from "../calendar";
export const useCalendar = () =>
  useSyncExternalStore(subscribeCalendar, calendarSnapshot);
