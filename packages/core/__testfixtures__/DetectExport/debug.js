import startCase from "lodash/startCase";
import { SupportedAnalyticTypes } from "./AnalyticTypeData";

type TAnalyticType = {
  [type: string]: {
    title: string,
  },
};

const AnalyticTypeMap: TAnalyticType = {};

SupportedAnalyticTypes.forEach(item => {
  AnalyticTypeMap[startCase(item.title).replace(/ /g, "")] = item;
});

export { AnalyticTypeMap };
