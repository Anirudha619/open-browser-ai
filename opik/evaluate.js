const { Opik, evaluate, BaseMetric } = require("opik");
const { browserEvaluationTask } = require("./task");

class Contains extends BaseMetric {
    constructor() {
        super("contains");
    }

    score({ output, expected_output }) {
        const score = output.toLowerCase().includes(expected_output.toLowerCase()) ? 1.0 : 0.0;
        return {
            name: this.name,
            value: score,
            reason: score === 1.0 ? "Output contains expected text" : "Output does not contain expected text"
        };
    }
}

const opikClient = new Opik();

async function runEvaluation() {
    const dataset = await opikClient.getOrCreateDataset("browser-tasks-2");
    
    await dataset.insert([
        {
            input: "find environmental cleanup volunteer opportunities in California this weekend",
            expected_output: "Title:, Date:, Location: California, Link:"
        },
        {
            input: "find food bank volunteer programs in New York",
            expected_output: "Food bank, New York, Volunteer, Link:"
        },
        {
            input: "find online volunteering opportunities for mental health support",
            expected_output: "Online, Mental Health, Volunteer, Apply"
        },
        {
            input: "find education volunteer opportunities for teaching kids in the US",
            expected_output: "Education, Teaching, Kids, United States, Link:"
        },
        {
            input: "find disaster relief volunteer opportunities currently active",
            expected_output: "Disaster Relief, Active, Volunteer, Organization, Link:"
        },
        {
            input: "find community service volunteer opportunities near San Francisco",
            expected_output: "Community Service, San Francisco, Volunteer, Location, Link:"
        },
        {
            input: "find animal shelter volunteer opportunities in Texas",
            expected_output: "Animal Shelter, Texas, Volunteer, Apply"
        },
        {
            input: "find climate change or sustainability volunteer programs",
            expected_output: "Climate, Sustainability, Volunteer Program, Link:"
        },
        {
            input: "find volunteering opportunities for students with flexible hours",
            expected_output: "Students, Flexible Hours, Volunteer, Apply"
        },
        {
            input: "find global online volunteering opportunities",
            expected_output: "Global, Online, Volunteer, Organization, Link:"
        },
        {
            input: "Founder of etherum",
            expected_output: "vitalik"
        }
    ]);
    
    const result = await evaluate({
        dataset,
        task: browserEvaluationTask,
        scoringMetrics: [new Contains()],
        experimentName: "Browser AI Evaluation"
    });
    
    console.log(`Experiment: ${result.experimentName}`);
    console.log(`Tests: ${result.testResults.length}`);
    result.testResults.forEach((test, i) => {
        console.log(`\nTest ${i + 1}:` , test);
        const input = test.testCase?.scoringInputs?.input;
        const output = test.testCase?.taskOutput?.output || test.testCase?.scoringInputs?.output;
        const expected_output = test.testCase?.scoringInputs?.expected_output
        console.log(`  Input: ${input}`);
        console.log(`  Output: ${output}`);
        console.log(`  Expected Output: ${expected_output}`);
        test.scoreResults?.forEach(s => console.log(`  ${s.name}: ${s.value}`));
    });
}

runEvaluation().catch(console.error);
module.exports = { runEvaluation };
