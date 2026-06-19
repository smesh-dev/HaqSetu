import type { Household, Profile } from "./rules/types";

// Synthetic personas — no real user data. They represent the people the
// research is about: poor, low-literacy, often rural families who are entitled
// to benefits but blocked by the documentation trap and the awareness gap.

const HH = (over: Partial<Household> = {}): Household => ({
  isWidow: false,
  isPregnantOrLactating: false,
  hasSchoolGoingChild: false,
  hasElderly60Plus: false,
  lacksPuccaHouse: false,
  lacksLpg: false,
  isRural: true,
  ...over,
});

export interface Persona {
  id: string;
  name: string;
  blurb: string;
  freeText: string;
  profile: Profile;
}

export const PERSONAS: Persona[] = [
  {
    id: "sunita",
    name: "Sunita — widow, 2 kids, only Aadhaar",
    blurb: "42, widow, OBC, BPL family in rural Bihar. Two school-going children. Has only an Aadhaar card.",
    freeText:
      "मेरा नाम सुनीता है, उम्र 42। मेरे पति की मृत्यु हो गई है। मैं बिहार के गाँv में रहती हूँ, घर में राशन भी मुश्किल से चलता है। मेरे दो बच्चे स्कूल जाते हैं। मेरे पास सिर्फ़ आधार कार्ड है। मुझे क्या-क्या मिल सकता है?",
    profile: {
      name: "Sunita",
      language: "hi",
      state: "BIHAR",
      category: "OBC",
      age: 42,
      gender: "female",
      annualHouseholdIncome: 90000,
      bpl: true,
      occupation: "informal",
      disability: "none",
      household: HH({ isWidow: true, hasSchoolGoingChild: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar"],
    },
  },
  {
    id: "ramlal",
    name: "Ramlal — 67, landless SC labourer, no caste cert",
    blurb: "67, SC, landless daily-wage worker in rural Rajasthan, BPL. Has Aadhaar + ration card but no caste certificate.",
    freeText:
      "I am Ramlal, 67 years old, from a village in Rajasthan. I belong to a Scheduled Caste and work as a daily-wage labourer. I have an Aadhaar and a ration card but no caste certificate. I have no land. What can I get?",
    profile: {
      name: "Ramlal",
      language: "en",
      state: "RAJASTHAN",
      category: "SC",
      age: 67,
      gender: "male",
      annualHouseholdIncome: 70000,
      bpl: true,
      occupation: "landless_laborer",
      landAcres: 0,
      disability: "none",
      household: HH({ hasElderly60Plus: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar", "ration_bpl"],
    },
  },
  {
    id: "lakshmi",
    name: "Lakshmi — pregnant, informal worker",
    blurb: "24, pregnant, OBC, poor household in rural Bihar. Has Aadhaar + bank account.",
    freeText:
      "I'm Lakshmi, 24, expecting my first baby. We're a poor family in Bihar, I do household and farm labour. I have Aadhaar and a bank account. Is there any help for me?",
    profile: {
      name: "Lakshmi",
      language: "en",
      state: "BIHAR",
      category: "OBC",
      age: 24,
      gender: "female",
      annualHouseholdIncome: 110000,
      bpl: true,
      occupation: "informal",
      disability: "none",
      household: HH({ isPregnantOrLactating: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar", "bank"],
    },
  },
  {
    id: "imran",
    name: "Imran — OBC student, the scholarship trap",
    blurb: "Father of an OBC class-11 student, Rajasthan, income ₹1.8L. Has caste cert but no income certificate.",
    freeText:
      "My son is in class 11, we are OBC, family income about 1.8 lakh a year in Rajasthan. We have Aadhaar, a bank account and a caste certificate, but no income certificate. Can he get a scholarship?",
    profile: {
      name: "Imran",
      language: "en",
      state: "RAJASTHAN",
      category: "OBC",
      age: 45,
      gender: "male",
      annualHouseholdIncome: 180000,
      bpl: false,
      occupation: "informal",
      disability: "none",
      household: HH({ hasSchoolGoingChild: true, isRural: false }),
      documentsHave: ["aadhaar", "bank", "caste"],
      docDetails: {
        names: { aadhaar: "Mohammad Imran Khan", bank: "Md Imran" },
        casteIsNCL: "no",
        bankAadhaarSeeded: "unsure",
      },
    },
  },
  {
    id: "govind",
    name: "Govind — small farmer, no pucca house",
    blurb: "38, small farmer (1.2 acres) in rural Rajasthan, lives in a kachha house. Has Aadhaar, bank, ration card.",
    freeText:
      "Main Govind hoon, 38 saal, Rajasthan ke gaon mein 1.2 acre zameen hai. Hamara kachha ghar hai. Aadhaar, bank account aur ration card hai. Kaun si yojana mil sakti hai?",
    profile: {
      name: "Govind",
      language: "en",
      state: "RAJASTHAN",
      category: "OBC",
      age: 38,
      gender: "male",
      annualHouseholdIncome: 130000,
      bpl: true,
      occupation: "small_farmer",
      landAcres: 1.2,
      disability: "none",
      household: HH({ lacksPuccaHouse: true, lacksLpg: true, isRural: true }),
      documentsHave: ["aadhaar", "bank", "ration_bpl"],
      docDetails: { names: {}, bankAadhaarSeeded: "no" },
    },
  },
];
