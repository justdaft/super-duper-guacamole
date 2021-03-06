import * as ts from "typescript";
import * as Lint from "../lint";
import * as BanRule from "./banRule";
export declare class Rule extends BanRule.Rule {
    apply(sourceFile: ts.SourceFile): Lint.RuleFailure[];
}
