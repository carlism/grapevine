import Anser from "anser";
import _ from "underscore"
import PropTypes from 'prop-types';
import React, {Fragment} from 'react';
import Sizzle from "sizzle"
import {Socket} from "phoenix";

import {ClientSocket} from "./socket";
import Keys from './keys';

let body = document.getElementById("body");
let userToken = body.getAttribute("data-user-token");

const keys = new Keys();

document.addEventListener('keydown', e => {
  if (!keys.isModifierKeyPressed()) {
    document.getElementById('prompt').focus();
  }
});

class SocketProvider extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      text: "",
      gmcp: {},
    }

    this.socket = new ClientSocket(this, this.props.game, userToken);
    this.socket.join();
  }

  appendText(message) {
    this.setState({text: this.state.text + message});
  }

  receiveGMCP(message, data) {
    console.log("Received GMCP", message, data);
    this.setState({
      gmcp: {...this.state.gmcp, [message]: data},
    })
  }

  getChildContext() {
    return {
      socket: this.socket,
      gmcp: this.state.gmcp,
      text: this.state.text,
    };
  }

  render() {
    return (
      <div>{this.props.children}</div>
    );
  }
}

SocketProvider.childContextTypes = {
  text: PropTypes.string,
  gmcp: PropTypes.object,
  socket: PropTypes.object,
}

class GaugeProvider extends React.Component {
  getChildContext() {
    return {
      gauges: this.props.gauges,
    };
  }

  render() {
    return (
      <div>{this.props.children}</div>
    );
  }
}

GaugeProvider.childContextTypes = {
  gauges: PropTypes.array,
}

class Prompt extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      text: "",
    };

    this.buttonSendMessage = this.buttonSendMessage.bind(this);
    this.onTextChange = this.onTextChange.bind(this);
    this.promptSendMessage = this.promptSendMessage.bind(this);
  }

  buttonSendMessage(e) {
    e.preventDefault();
    this.sendMessage();
  }

  promptSendMessage(e) {
    if (e.keyCode == 13) {
      this.sendMessage();
    }
  }

  sendMessage() {
    const {socket} = this.context;
    socket.send(`${this.state.text}\n`);
    this.setState({text: ""});
  }

  onTextChange(e) {
    this.setState({
      text: e.target.value,
    });
  }

  render() {
    let text = this.state.text;

    return (
      <div className="prompt">
        <input id="prompt"
          value={text}
          onChange={this.onTextChange}
          type="text"
          className="form-control"
          autoFocus={true}
          onKeyDown={this.promptSendMessage} />
        <button id="send" className="btn btn-primary" onClick={this.buttonSendMessage}>Send</button>
      </div>
    );
  }
}

Prompt.contextTypes = {
  socket: PropTypes.object,
};

class AnsiText extends React.Component {
  textStyle(parsed) {
    let style = {};

    if (parsed.bg) {
      style.backgroundColor = `rgb(${parsed.bg})`;
    }

    if (parsed.fg) {
      style.color = `rgb(${parsed.fg})`;
    }

    return style;
  }

  render() {
    let parsedText = Anser.ansiToJson(this.props.children);

    return (
      <Fragment>
        {_.map(parsedText, (data, i) => {
          return (
            <span key={i} style={this.textStyle(data)}>{data.content}</span>
          );
        })}
      </Fragment>
    );
  }
}

class Terminal extends React.Component {
  componentDidMount() {
    this.scrollToBottom();
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.el.scrollIntoView();
  }

  render() {
    let text = this.context.text;

    return (
      <div className="terminal">
        <AnsiText>{text}</AnsiText>
        <div ref={el => { this.el = el; }} />
      </div>
    );
  }
}

Terminal.contextTypes = {
  text: PropTypes.string,
}

class Gauges extends React.Component {
  render() {
    let gauges = this.context.gauges;

    return (
      <div className="gauges">
        {_.map(gauges, (gauge, i) => {
          return (
            <Gauge gauge={gauge} key={i} />
          );
        })}
      </div>
    );
  }
}

Gauges.contextTypes = {
  gauges: PropTypes.array,
}

class Gauge extends React.Component {
  render() {
    let {name, message, value, max, color} = this.props.gauge;

    let data = this.context.gmcp[message];

    if (data) {
      let currentValue = data[value];
      let maxValue = data[max];

      let width = currentValue / maxValue * 100;

      let className = `gauge ${color}`;

      return (
        <div className={className}>
          <div className="gauge-bar" style={{width: `${width}%`}} />
          <span>{currentValue}/{maxValue} {name}</span>
        </div>
      );
    } else {
      return null;
    }
  }
}

Gauge.contextTypes = {
  gmcp: PropTypes.object,
}

class Client extends React.Component {
  render() {
    return (
      <SocketProvider game={this.props.game}>
        <GaugeProvider gauges={this.props.gauges}>
          <div className="play">
            <div className="alert alert-danger">
              <b>NOTE:</b> This web client is in <b>beta</b> and might close your connection at any time.
            </div>

            <div className="window">
              <Terminal />
              <Gauges />
              <Prompt />
            </div>
          </div>
        </GaugeProvider>
      </SocketProvider>
    );
  }
}

export {Client}
