import _ from "underscore";
import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {
  promptClear,
  promptSetCurrentText,
  promptHistoryAdd,
  promptHistoryScrollBackward,
  promptHistoryScrollForward
} from "../redux/actions";

import {
  getSocketPromptType,
  getPromptDisplayText,
} from "../redux/store";

class Prompt extends React.Component {
  constructor(props) {
    super(props);

    this.buttonSendMessage = this.buttonSendMessage.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onTextChange = this.onTextChange.bind(this);

    this.shouldSelect = false;
  }

  buttonSendMessage(e) {
    e.preventDefault();
    this.sendMessage();
  }

  onKeyDown(e) {
    if (this.props.promptType === "text") {
      this.onKeyDownText(e);
    } else if (this.props.promptType === "password") {
      this.onKeyDownPassword(e);
    }
  }

  onKeyDownText(e) {
    switch (e.keyCode) {
      case 13: {
        this.sendMessage();
        break;
      }
      case 38: { // up
        e.preventDefault();
        this.props.promptHistoryScrollBackward();
        this.shouldSelect = true;
        break;
      }
      case 40: { // down
        e.preventDefault();
        this.props.promptHistoryScrollForward();
        this.shouldSelect = true;
        break;
      }
    }
  }

  onKeyDownPassword(e) {
    switch (e.keyCode) {
      case 13: {
        this.sendPassword();
        break;
      }
    }
  }

  sendMessage() {
    const {socket} = this.context;
    socket.send(`${this.props.displayText}\n`);
    this.props.promptHistoryAdd();
    this.prompt.select();
  }

  sendPassword() {
    const {socket} = this.context;
    console.log(this.props.displayText);
    socket.send(`${this.props.displayText}\n`);
    this.props.promptClear();
  }

  onTextChange(e) {
    this.props.promptSetCurrentText(e.target.value);
  }

  componentDidUpdate() {
    if (this.shouldSelect) {
      this.shouldSelect = false;
      this.prompt.select();
    }
  }

  render() {
    return (
      <div className="prompt">
        <input id="prompt"
          value={this.props.displayText}
          onChange={this.onTextChange}
          type={this.props.promptType}
          className="form-control"
          autoFocus={true}
          onKeyDown={this.onKeyDown}
          ref={el => { this.prompt = el; }} />
        <button id="send" className="btn btn-primary" onClick={this.buttonSendMessage}>Send</button>
      </div>
    );
  }
}

Prompt.contextTypes = {
  socket: PropTypes.object,
};

let mapStateToProps = (state) => {
  let promptType = getSocketPromptType(state);
  let displayText = getPromptDisplayText(state);
  return {displayText, promptType};
};

export default Prompt = connect(mapStateToProps, {
  promptClear,
  promptHistoryAdd,
  promptHistoryScrollBackward,
  promptHistoryScrollForward,
  promptSetCurrentText,
})(Prompt);
