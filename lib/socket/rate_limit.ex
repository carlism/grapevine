defmodule Socket.RateLimit do
  @moduledoc """
  Handles rate limiting for socket actions

  - Tracks current count of requests and total allowed
  - Last timestamp of send
  - Determines if a new request would go over
  - Handles reducing the current count because of the "leaky bucket"
  """

  defstruct current: 0, last_sent_at: nil, limit: 10, rate_per_second: 1

  @doc """
  Increase the current count for rate limit state

  Handles leaking the current bucket as well as limits
  """
  def increase(rate_limit, now \\ Timex.now()) do
    difference = calculate_seconds_difference(rate_limit, now)
    rate_limit = adjust_current(rate_limit, difference)

    rate_limit =
      rate_limit
      |> Map.put(:current, rate_limit.current + 1)
      |> Map.put(:last_sent_at, now)

    case rate_limit.current > rate_limit.limit do
      true ->
        {:error, :limit_exceeded}

      false ->
        {:ok, rate_limit}
    end
  end

  @doc """
  Calculate the seconds difference from last sent at to now

      iex> RateLimit.calculate_seconds_difference(%{last_sent_at: nil}, Timex.now())
      0

      iex> two_seconds_ago = Timex.shift(Timex.now(), seconds: -2)
      ...> RateLimit.calculate_seconds_difference(%{last_sent_at: two_seconds_ago}, Timex.now())
      2
  """
  def calculate_seconds_difference(%{last_sent_at: nil}, _now), do: 0

  def calculate_seconds_difference(rate_limit, now) do
    Timex.diff(now, rate_limit.last_sent_at, :seconds)
  end

  @doc """
  Subtract the leak from the current bucket

      iex> RateLimit.adjust_current(%RateLimit{current: 10, rate_per_second: 2}, 2)
      %RateLimit{current: 6, rate_per_second: 2}
  """
  def adjust_current(rate_limit, difference) do
    current = rate_limit.current - difference * rate_limit.rate_per_second

    case current < 0 do
      true ->
        %{rate_limit | current: 0}

      false ->
        %{rate_limit | current: current}
    end
  end
end
