// @flow

type TProps<T> = {
  value: T,
};

const A = <TValue>(props: TProps<TValue>) => null;
