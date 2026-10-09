import aysel from "@/data/contracts/employee-aysel-mammadova.json";
import leyla from "@/data/contracts/employee-leyla-hasanova.json";
import rashad from "@/data/contracts/employee-rashad-aliyev.json";
import ownTerms from "@/data/contracts/own-terms.json";
import brightclean from "@/data/contracts/partner-brightclean.json";
import caspian from "@/data/contracts/partner-caspian-freight.json";
import novatech from "@/data/contracts/partner-novatech.json";
import zenith from "@/data/contracts/partner-zenith.json";
import type { Contract } from "@/lib/types";

/**
 * The sample contracts an empty database starts with. They are imported, not
 * read from disk at run time, so they are part of the build on hosts that only
 * ship the files a build references.
 */
export const SEED_CONTRACTS = [ownTerms, brightclean, caspian, novatech, zenith, aysel, leyla, rashad] as Contract[];
