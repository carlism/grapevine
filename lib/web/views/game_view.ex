defmodule Web.GameView do
  use Web, :view

  alias Grapevine.Achievements
  alias Grapevine.Channels
  alias Grapevine.Games.Images
  alias Grapevine.UserAgents
  alias Stein.Storage
  alias Web.EventView

  def cover_img_with_default(conn, game) do
    case has_cover?(game) do
      true ->
        cover_img(game)

      false ->
        default_cover_img(conn)
    end
  end

  def cover_preview_img(game), do: cover_img(game)

  def cover_img(game) do
    content_tag(:div, class: "cover") do
      [
        img_tag(Storage.url(Images.cover_path(game, "thumbnail")), alt: "#{game.name} Cover Image"),
        content_tag(:div, "", class: "shadow")
      ]
    end
  end

  def hero_preview_img(game) do
    content_tag(:div, class: "cover") do
      [
        img_tag(Storage.url(Images.hero_path(game, "thumbnail")), alt: "#{game.name} Hero Image"),
        content_tag(:div, "", class: "shadow")
      ]
    end
  end

  def hero_img(%{hero_key: nil}), do: []

  def hero_img(game) do
    content_tag(:div, class: "hero") do
      [
        img_tag(Storage.url(Images.hero_path(game, "thumbnail")), alt: "#{game.name} Hero Image"),
        content_tag(:div, "", class: "shadow")
      ]
    end
  end

  def default_cover_img(conn) do
    content_tag(:div, class: "cover") do
      [
        img_tag(static_path(conn, "/images/default-cover.png"), alt: "Default Game Cover"),
        content_tag(:div, "", class: "shadow")
      ]
    end
  end

  def has_cover?(game) do
    game.cover_key != nil
  end

  def has_hero?(game) do
    game.hero_key != nil
  end

  def play_button(conn, game) do
    case show_play_button?(conn, game) do
      true ->
        web_connection =
          Enum.find(game.connections, fn connection ->
            connection.type == "web"
          end)

        case !is_nil(web_connection) do
          true ->
            web_play_link(web_connection)

          false ->
            client_play_link(conn, game)
        end

      false ->
        []
    end
  end

  defp web_play_link(web_connection) do
    link(to: web_connection.url, target: "_blank", class: "btn btn-primary play-launch") do
      [
        "Play ",
        content_tag(:i, "", class: "fas fa-external-link-alt")
      ]
    end
  end

  defp client_play_link(conn, game) do
    link(to: play_path(conn, :show, game.short_name), class: "btn btn-primary play-launch") do
      [
        "Play ",
        content_tag(:i, "", class: "fas fa-angle-double-right")
      ]
    end
  end

  def show_play_button?(conn, game) do
   web_connection?(game) || (client_enabled?(conn, game) && telnet_connection?(game))
  end

  defp client_enabled?(conn, game) do
    case Map.has_key?(conn.assigns, :current_user) do
      true ->
        game.enable_web_client

      false ->
        game.enable_web_client && game.allow_anonymous_client
    end
  end

  defp telnet_connection?(game) do
    Enum.any?(game.connections, fn connection ->
      connection.type == "telnet"
    end)
  end

  defp web_connection?(game) do
    Enum.any?(game.connections, fn connection ->
      connection.type == "web"
    end)
  end

  def render("online.json", %{games: games}) do
    %{
      collection: render_many(games, __MODULE__, "presence.json")
    }
  end

  def render("presence.json", %{game: game}) do
    %{
      game: Map.take(game.game, [:name, :homepage_url]),
      players: game.players
    }
  end

  def user_agent(game) do
    case game.user_agent do
      nil ->
        nil

      user_agent ->
        display_user_agent(user_agent)
    end
  end

  defp display_user_agent(user_agent) do
    with {:ok, user_agent} <- UserAgents.get_user_agent(user_agent),
         {:ok, user_agent} <- check_if_repo_url(user_agent) do
      link(user_agent.version, to: user_agent.repo_url, target: "_blank")
    else
      {:error, :no_repo_url, user_agent} ->
        user_agent.version

      _ ->
        nil
    end
  end

  defp check_if_repo_url(user_agent) do
    case user_agent.repo_url do
      nil ->
        {:error, :no_repo_url, user_agent}

      _ ->
        {:ok, user_agent}
    end
  end

  def display_channel?(channel) do
    case Channels.get(channel) do
      {:ok, channel} ->
        !channel.hidden

      _ ->
        false
    end
  end

  def display_players?(game, players) do
    game.display_players && !Enum.empty?(players)
  end

  def online_status(game) do
    active_cutoff = Timex.now() |> Timex.shift(minutes: -1)

    case Timex.before?(active_cutoff, game.last_seen_at) do
      true ->
        content_tag(:i, "", class: "fa fa-circle online", alt: "Game Online", title: "Online")

      _ ->
        mssp_cutoff = Timex.now() |> Timex.shift(minutes: -90)

        case Timex.before?(mssp_cutoff, game.telnet_last_seen_at) do
          true ->
            content_tag(:i, "", class: "fa fa-adjust online", alt: "Seen on MSSP", title: "Seen on MSSP")

          _ ->
            content_tag(:i, "", class: "fa fa-circle offline", alt: "Game Offline", title: "Offline")
        end
    end
  end

  def connection_info(connection) do
    case connection.type do
      "web" ->
        link(connection.url, to: connection.url, target: "_blank")

      "telnet" ->
        "#{connection.host}:#{connection.port}"

      "secure telnet" ->
        "#{connection.host}:#{connection.port}"
    end
  end
end
