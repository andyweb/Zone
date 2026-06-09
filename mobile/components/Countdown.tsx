// Countdown al TTL residuo: parte da seconds_left e scala in locale ogni
// secondo, così il marker mostra il tempo che cala senza ricontattare il server.

import React, { useEffect, useState } from "react";
import { Text, TextProps } from "react-native";

import { formatCountdown } from "../lib/format";

interface Props extends TextProps {
  secondsLeft: number;
}

export function Countdown({ secondsLeft, ...rest }: Props) {
  const [remaining, setRemaining] = useState(secondsLeft);

  useEffect(() => {
    setRemaining(secondsLeft);
  }, [secondsLeft]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <Text {...rest}>{formatCountdown(remaining)}</Text>;
}
