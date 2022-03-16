import React from "react";
import './App.css';
import "bootstrap/dist/css/bootstrap.css"
import "bootstrap-icons/font/bootstrap-icons.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";

//import pages component
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Faq from "./pages/Faq";

class App extends React.Component {
      render(){
        return(
          <BrowserRouter>
                <Routes>
                  <Route path="/faq" element={<Faq />} />
                  <Route path="/" element={<Home />} />
                </Routes>
          </BrowserRouter>
        )
      }
 }

export default App