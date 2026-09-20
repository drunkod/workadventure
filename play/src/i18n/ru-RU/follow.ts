import type { BaseTranslation } from "../i18n-types";

const follow: BaseTranslation = {
    interactStatus: {
        following: "Вы следуете за {leader}",
        waitingFollowers: "Ожидание подтверждения подписчиков",
        followed: {
            one: "{follower} следует за вами",
            two: "{firstFollower} и {secondFollower} следуют за вами",
            many: "{followers} и {lastFollower} следуют за вами",
        },
    },
    interactMenu: {
        title: {
            interact: "Взаимодействие",
            follow: "Хотите следовать за {leader}?",
        },
        stop: {
            leader: "Хотите перестать вести за собой?",
            follower: "Хотите перестать следовать за {leader}?",
        },
        yes: "Да",
        no: "Нет",
    },
    actionName: "Найти",
};

export default follow;
