type TargetEvent<T> = Event & {
  currentTarget: EventTarget & T;
};
