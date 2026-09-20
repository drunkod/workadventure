import type { BaseTranslation } from "../i18n-types";

const area: BaseTranslation = {
    noAccess: "Извините, у вас нет доступа к этой области.",
    personalArea: {
        claimDescription: "Это личная область. Хотите сделать её своей?",
        buttons: {
            yes: "Да",
            no: "Нет",
        },
        personalSpaceWithNames: "Личное пространство {name}",
        alreadyHavePersonalArea: "У вас уже есть личная область. Она будет удалена, если вы присвоите эту.",
    },
};

export default area;
