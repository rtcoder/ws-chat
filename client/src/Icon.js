import './App.css';
import React from "react";

const Icon = ({className, children}) => {
    className = ("icon material-icons " + (className || '')).trim();
    return (
        <i className={className}>{children}</i>
    );
}

export default Icon;
