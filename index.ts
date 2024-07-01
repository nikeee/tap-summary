import * as fs from "node:fs/promises";
import * as core from "@actions/core";
import {
	SummaryTableCell,
	type SummaryTableRow,
} from "@actions/core/lib/summary";
import { glob } from "glob";
import { type EventLog, Parser } from "tap-parser";

async function main() {
	const path = core.getInput("path", { required: false }) ?? "**/*.tap";
	const showSuccessful =
		core.getInput("show-successful", { required: false }) === "true";

	const tapFiles = await glob(path);
	core.debug(`Found ${tapFiles.length} files:`);
	core.debug(tapFiles.join("\n"));

	for (const tapFile of tapFiles) {
		try {
			const tapContent = await fs.readFile(tapFile, "utf-8");
			const parsed = Parser.parse(tapContent);
			appendReport(parsed, showSuccessful);
			// biome-ignore lint/suspicious/noExplicitAny: handled properly
		} catch (err: any) {
			core.summary.addDetails(
				`Failed to process file "${tapFile}"`,
				err?.message ?? JSON.stringify(err),
			);
		}
	}
	core.summary.write();
}
main().catch(() => process.exit(1));

interface CompletionEventData {
	ok: boolean;
	count: number;
	pass: number;
	fail: number;
	bailout: boolean;
	todo: number;
	skip: number;
	failures?: TestResult[] | null;
	skips?: TestResult[] | null;
	todos?: TestResult[] | null;
	// passes?: TestResult[] | null;
	// time: number | null;
	plan: Plan;
}

interface Plan {
	start: number;
	end: number;
	skipAll: boolean;
	skipReason?: string | null;
	comment?: string | null;
}

interface TestResult {
	ok: boolean;
	name: string;
	id: number;
}

// Thanks to: https://github.com/test-summary/action/blob/main/src/index.ts
const icons = {
	dashboardBase: "https://svg.test-summary.com/dashboard.svg",
	pass: "https://svg.test-summary.com/icon/pass.svg?s=12",
	fail: "https://svg.test-summary.com/icon/fail.svg?s=12",
	skip: "https://svg.test-summary.com/icon/skip.svg?s=12",
	none: "https://svg.test-summary.com/icon/none.svg?s=12",
};
const footer = `This test report was produced by the <a href="https://github.com/nikeee/tap-summary">tap-summary action</a>.&nbsp; Made with ❤️ in Hesse.`;

function appendReport(events: EventLog, showSuccessful: boolean) {
	const completed = events
		.filter((event) => event[0] === "complete")
		.map((event) => event[1]);

	if (completed.length === 0 || completed.length > 1) {
		return undefined;
	}

	const completionData = completed[0] as CompletionEventData | undefined;
	if (!completionData) {
		return undefined;
	}

	const img = getSummaryImage(completionData);
	core.summary.addImage(...img);

	const testResults = events
		.filter((event) => event[0] === "assert")
		.map((event) => event[1] as { ok: boolean; name?: string; id?: number })
		.sort((a, b) => Number(a.ok) - Number(b.ok));

	const resultsToDisplay = showSuccessful
		? testResults
		: testResults.filter((result) => !result.ok);

	if (resultsToDisplay.length > 0) {
		const rows: SummaryTableRow[] = [
			[
				{ data: "Status", header: true },
				{ data: "Test", header: true },
			],
		];
		for (const test of resultsToDisplay) {
			const testName = test.name ?? test.id?.toString() ?? "Unknown Test";
			rows.push([{ data: test.ok ? "✅" : "❌" }, { data: testName }]);
		}
		core.summary.addTable(rows);
	}

	console.log(events);
	console.log(completionData); // TODO: Remove
}

function getSummaryImage(event: CompletionEventData): [string, string] {
	const summary: string[] = [];
	if (event.pass > 0) {
		summary.push(`${event.pass} passed`);
	}
	if (event.fail > 0) {
		summary.push(`${event.fail} failed`);
	}
	if (event.skip > 0) {
		summary.push(`${event.skip} skipped`);
	}
	if (event.todo > 0) {
		summary.push(`${event.todo} todo`);
	}

	const altText = summary.join(", ");
	const url = new URL(icons.dashboardBase);
	url.searchParams.set("p", event.pass.toString());
	url.searchParams.set("f", event.fail.toString());
	url.searchParams.set("s", event.skip.toString());
	url.searchParams.set("t", event.todo.toString());
	return [url.toString(), altText];
}

function getTestImage(event: CompletionEventData): [string, string] {
	if (event.fail > 0) {
		return [icons.fail, `${event.fail} test failures`];
	}
	if (event.skip > 0) {
		return [icons.skip, `${event.skip} skipped tests`];
	}
	if (event.todo > 0) {
		return [icons.skip, `${event.todo} todo tests`];
	}
	if (event.ok) {
		return [icons.pass, "All tests passed"];
	}
	return [icons.none, "No tests found"];
}
