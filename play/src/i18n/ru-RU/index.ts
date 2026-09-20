import merge from "ts-deepmerge";
import en_US from "../en-US";
import messageScreen from "./messageScreen";
import trigger from "./trigger";
import refreshPrompt from "./refreshPrompt";
import report from "./report";
import area from "./area";
import video from "./video";
import login from "./login";
import cowebsite from "./cowebsite";
import audio from "./audio";
import externalModule from "./externalModule";
import mapEditor from "./mapEditor";
import camera from "./camera";
import form from "./form";
import chat from "./chat";
import menu from "./menu";
import megaphone from "./megaphone";
import warning from "./warning";
import say from "./say";
import locate from "./locate";
import notification from "./notification";
import statusModal from "./statusModal";
import actionbar from "./actionbar";
import recording from "./recording";
import follow from "./follow";
import companion from "./companion";
import error from "./error";
import woka from "./woka";
import randomNames from "./randomNames";

const ru_RU = merge(en_US, {
    messageScreen,
    trigger,
    refreshPrompt,
    report,
    area,
    video,
    login,
    cowebsite,
    audio,
    externalModule,
    mapEditor,
    camera,
    form,
    chat,
    menu,
    megaphone,
    warning,
    say,
    locate,
    notification,
    statusModal,
    actionbar,
    recording,
    follow,
    companion,
    error,
    woka,
    randomNames,
});

export default ru_RU;
