import React from "react";
import "../assets/css/styles.css";
import {Helmet} from "react-helmet";
import { verifyToken } from "../helper/auth";


class NotFound extends React.Component{
    componentDidMount() { 
        if(localStorage.getItem("config") !== null) {
            if(JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme === "dark") {
                document.body.style.backgroundColor = "#2D2B3F";
            } else if(JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme === "light") {
                document.body.style.backgroundColor = "#fff";
            }
        }
    }

    render(){
        return(
           <div className="text-center d-flex justify-content-center pt-4 text-muted">
               <Helmet>
                    <title>
                        Solanascan Page NotFound
                    </title>
                </Helmet>
               <p className="h2">
                 <img src="https://cdn.discordapp.com/attachments/890238141687009300/943491703657074769/404.png" alt="" />
                 <b>PAGE NOT FOUND</b>
               </p>
           </div>
        )
    }
}


export default NotFound;