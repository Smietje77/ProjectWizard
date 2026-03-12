<script lang="ts">
    import { i18n } from "$lib/i18n";
    import type { WizardAnswer } from "$lib/types";

    interface GeneratedFile {
        path: string;
        content: string;
    }

    interface Props {
        files: GeneratedFile[];
        answers: WizardAnswer[];
        projectName: string;
        description: string;
        onFilesUpdated: (files: GeneratedFile[]) => void;
    }

    let { files, answers, projectName, description, onFilesUpdated }: Props =
        $props();

    // --- State ---
    let expandedSkill = $state<string | null>(null);
    let feedbackText = $state("");
    let isRefining = $state(false);
    let refineError = $state<string | null>(null);
    let refineSuccess = $state<string | null>(null);
    let showEvalsFor = $state<string | null>(null);
    let copiedEval = $state<string | null>(null);
    let regenerateEvals = $state(true);
    let copiedEvalTimeout: ReturnType<typeof setTimeout> | null = null;
    let refineSuccessTimeout: ReturnType<typeof setTimeout> | null = null;

    // Cleanup timers bij unmount
    $effect(() => {
        return () => {
            if (copiedEvalTimeout) clearTimeout(copiedEvalTimeout);
            if (refineSuccessTimeout) clearTimeout(refineSuccessTimeout);
        };
    });

    // --- Derived ---
    let skillFiles = $derived(
        files.filter(
            (f) =>
                f.path.endsWith(".md") &&
                f.path.includes(".claude/skills/") &&
                !f.path.endsWith(".evals.md"),
        ),
    );

    let evalFiles = $derived(files.filter((f) => f.path.endsWith(".evals.md")));

    function getEvalForSkill(skillPath: string): GeneratedFile | undefined {
        const evalPath = skillPath.replace(".md", ".evals.md");
        return evalFiles.find((f) => f.path === evalPath);
    }

    function getSpecialistId(skillPath: string): string {
        // .claude/skills/backend.md → backend
        const filename = skillPath.split("/").pop() || "";
        return filename.replace(".md", "");
    }

    function getSkillCategory(content: string): string {
        const match = content.match(/category:\s*([\w]+)/);
        if (!match) return "unknown";
        return match[1] === "capability_uplift"
            ? "Capability Uplift"
            : "Workflow";
    }

    function getCategoryColor(content: string): string {
        const match = content.match(/category:\s*([\w]+)/);
        if (!match) return "bg-surface-500/10 text-surface-500";
        return match[1] === "capability_uplift"
            ? "bg-warning-500/10 text-warning-600 dark:text-warning-400"
            : "bg-tertiary-500/10 text-tertiary-600 dark:text-tertiary-400";
    }

    function getSkillTitle(content: string): string {
        // Probeer de eerste markdown heading te vinden
        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("# ") && !trimmed.startsWith("# ---")) {
                return trimmed.slice(2);
            }
        }
        return "";
    }

    function getSkillSummary(content: string): string {
        // Haal eerste paragraaf na de frontmatter
        const lines = content.split("\n");
        let pastFrontmatter = false;
        let pastTitle = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === "---") {
                pastFrontmatter = !pastFrontmatter;
                continue;
            }
            if (!pastFrontmatter) continue;
            if (trimmed.startsWith("#")) {
                pastTitle = true;
                continue;
            }
            if (pastTitle && trimmed.length > 20) {
                return trimmed.length > 150
                    ? trimmed.slice(0, 150) + "..."
                    : trimmed;
            }
        }
        return "";
    }

    function countEvalTests(evalContent: string): number {
        return (evalContent.match(/### Test \d+/g) || []).length;
    }

    async function copyToClipboard(text: string, id: string) {
        await navigator.clipboard.writeText(text);
        copiedEval = id;
        if (copiedEvalTimeout) clearTimeout(copiedEvalTimeout);
        copiedEvalTimeout = setTimeout(() => {
            copiedEval = null;
        }, 2000);
    }

    function extractEvalPrompts(
        evalContent: string,
    ): Array<{ name: string; type: string; prompt: string }> {
        const prompts: Array<{ name: string; type: string; prompt: string }> =
            [];
        const testRegex =
            /### Test \d+:\s*(.+)\n\*\*Type:\*\*\s*(?:[🎯🚫📊]\s*)?(\w+)\n\n\*\*Prompt:\*\*\n```\n([\s\S]*?)```/g;
        let match;
        while ((match = testRegex.exec(evalContent)) !== null) {
            prompts.push({
                name: match[1].trim(),
                type: match[2].trim(),
                prompt: match[3].trim(),
            });
        }
        return prompts;
    }

    async function refineSkill(skillPath: string) {
        if (!feedbackText.trim()) return;

        isRefining = true;
        refineError = null;
        refineSuccess = null;

        const specialistId = getSpecialistId(skillPath);
        const skillFile = files.find((f) => f.path === skillPath);
        if (!skillFile) return;

        try {
            const response = await fetch("/api/refine-skill", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    specialistId,
                    skillContent: skillFile.content,
                    feedback: feedbackText.trim(),
                    answers,
                    projectName,
                    description,
                    regenerateEvals,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                refineError = data.error || "Onbekende fout";
                return;
            }

            const data = await response.json();

            // Update de files array met de verfijnde skill
            const updatedFiles = files.map((f) => {
                if (f.path === skillPath) {
                    return { ...f, content: data.refinedSkill };
                }
                // Update eval als die ook opnieuw is gegenereerd
                if (
                    data.newEvalContent &&
                    f.path === skillPath.replace(".md", ".evals.md")
                ) {
                    return { ...f, content: data.newEvalContent };
                }
                return f;
            });

            // Als er een nieuwe eval is maar nog geen eval file bestond, voeg die toe
            if (data.newEvalContent) {
                const evalPath = skillPath.replace(".md", ".evals.md");
                if (!updatedFiles.some((f) => f.path === evalPath)) {
                    updatedFiles.push({
                        path: evalPath,
                        content: data.newEvalContent,
                    });
                }
            }

            onFilesUpdated(updatedFiles);
            refineSuccess = data.message;
            feedbackText = "";

            // Auto-dismiss success message
            if (refineSuccessTimeout) clearTimeout(refineSuccessTimeout);
            refineSuccessTimeout = setTimeout(() => {
                refineSuccess = null;
            }, 4000);
        } catch (error) {
            refineError =
                error instanceof Error ? error.message : "Onbekende fout";
        } finally {
            isRefining = false;
        }
    }
</script>

{#if skillFiles.length > 0}
    <div class="card space-y-4 p-6" id="skill-review-section">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">{i18n.t.skillReview.title}</h2>
            <span
                class="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-500"
            >
                Skills 2.0
            </span>
        </div>
        <p class="text-sm opacity-60">{i18n.t.skillReview.description}</p>

        <div class="space-y-3">
            {#each skillFiles as skill}
                {@const specialistId = getSpecialistId(skill.path)}
                {@const evalFile = getEvalForSkill(skill.path)}
                {@const isExpanded = expandedSkill === skill.path}
                {@const title =
                    getSkillTitle(skill.content) || `${specialistId} skill`}
                {@const category = getSkillCategory(skill.content)}
                {@const categoryColor = getCategoryColor(skill.content)}
                {@const summary = getSkillSummary(skill.content)}

                <div
                    class="rounded-xl border border-surface-500/10 transition-all duration-300 {isExpanded
                        ? 'border-primary-500/30 bg-primary-500/5'
                        : 'hover:border-surface-500/20'}"
                >
                    <!-- Skill Header -->
                    <button
                        type="button"
                        class="flex w-full items-center justify-between gap-3 p-4 text-left"
                        onclick={() => {
                            expandedSkill = isExpanded ? null : skill.path;
                            if (!isExpanded) {
                                feedbackText = "";
                                refineError = null;
                                refineSuccess = null;
                            }
                        }}
                    >
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold">{title}</span>
                                <span
                                    class="rounded-full px-2 py-0.5 text-xs font-medium {categoryColor}"
                                >
                                    {category}
                                </span>
                                {#if evalFile}
                                    <span
                                        class="rounded-full bg-success-500/10 px-2 py-0.5 text-xs font-medium text-success-600 dark:text-success-400"
                                    >
                                        {countEvalTests(evalFile.content)} evals
                                    </span>
                                {/if}
                            </div>
                            {#if summary && !isExpanded}
                                <p class="mt-1 truncate text-sm opacity-50">
                                    {summary}
                                </p>
                            {/if}
                        </div>
                        <span
                            class="shrink-0 text-lg opacity-40 transition-transform duration-200 {isExpanded
                                ? 'rotate-180'
                                : ''}"
                        >
                            ▼
                        </span>
                    </button>

                    <!-- Expanded Skill Content -->
                    {#if isExpanded}
                        <div
                            class="space-y-4 border-t border-surface-500/10 p-4"
                        >
                            <!-- Skill Preview -->
                            <div>
                                <h4 class="mb-2 text-sm font-medium opacity-70">
                                    {i18n.t.skillReview.skillContent}
                                </h4>
                                <pre
                                    class="max-h-60 overflow-auto rounded-lg bg-surface-50-950 p-3 font-mono text-xs leading-relaxed">{skill.content}</pre>
                            </div>

                            <!-- Eval Section -->
                            {#if evalFile}
                                <div>
                                    <button
                                        type="button"
                                        class="flex items-center gap-2 text-sm font-medium text-primary-500 hover:underline"
                                        onclick={() => {
                                            showEvalsFor =
                                                showEvalsFor === skill.path
                                                    ? null
                                                    : skill.path;
                                        }}
                                    >
                                        <span
                                            >{showEvalsFor === skill.path
                                                ? "▼"
                                                : "▶"}</span
                                        >
                                        {i18n.t.skillReview.viewEvals} ({countEvalTests(
                                            evalFile.content,
                                        )} tests)
                                    </button>

                                    {#if showEvalsFor === skill.path}
                                        {@const prompts = extractEvalPrompts(
                                            evalFile.content,
                                        )}
                                        <div class="mt-3 space-y-3">
                                            {#if prompts.length > 0}
                                                {#each prompts as evalPrompt, idx}
                                                    <div
                                                        class="rounded-lg border border-surface-500/10 p-3"
                                                    >
                                                        <div
                                                            class="flex items-center justify-between gap-2"
                                                        >
                                                            <div
                                                                class="flex items-center gap-2"
                                                            >
                                                                <span
                                                                    class="text-sm"
                                                                >
                                                                    {evalPrompt.type ===
                                                                    "trigger"
                                                                        ? "🎯"
                                                                        : evalPrompt.type ===
                                                                            "negative"
                                                                          ? "🚫"
                                                                          : "📊"}
                                                                </span>
                                                                <span
                                                                    class="text-sm font-medium"
                                                                    >{evalPrompt.name}</span
                                                                >
                                                                <span
                                                                    class="rounded bg-surface-200-800 px-1.5 py-0.5 text-xs opacity-60"
                                                                >
                                                                    {evalPrompt.type}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                class="btn btn-sm preset-outlined-surface-500"
                                                                onclick={() =>
                                                                    copyToClipboard(
                                                                        evalPrompt.prompt,
                                                                        `eval-${idx}`,
                                                                    )}
                                                            >
                                                                {copiedEval ===
                                                                `eval-${idx}`
                                                                    ? i18n.t
                                                                          .preview
                                                                          .copied
                                                                    : i18n.t
                                                                          .preview
                                                                          .copyButton}
                                                            </button>
                                                        </div>
                                                        <pre
                                                            class="mt-2 rounded bg-surface-100-900 p-2 font-mono text-xs">{evalPrompt.prompt}</pre>
                                                    </div>
                                                {/each}
                                            {:else}
                                                <!-- Fallback: toon raw eval content -->
                                                <pre
                                                    class="max-h-40 overflow-auto rounded-lg bg-surface-50-950 p-3 font-mono text-xs leading-relaxed">{evalFile.content}</pre>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/if}

                            <!-- Feedback / Refinement -->
                            <div
                                class="space-y-3 rounded-lg border border-dashed border-surface-500/20 p-4"
                            >
                                <h4 class="text-sm font-semibold">
                                    {i18n.t.skillReview.refineTitle}
                                </h4>
                                <p class="text-xs opacity-50">
                                    {i18n.t.skillReview.refineHint}
                                </p>

                                <textarea
                                    class="input w-full rounded-lg p-3 text-sm"
                                    rows="3"
                                    placeholder={i18n.t.skillReview
                                        .refinePlaceholder}
                                    bind:value={feedbackText}
                                    disabled={isRefining}
                                ></textarea>

                                {#if evalFile}
                                    <label
                                        class="flex items-center gap-2 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            bind:checked={regenerateEvals}
                                            class="checkbox"
                                        />
                                        {i18n.t.skillReview
                                            .regenerateEvalsLabel}
                                    </label>
                                {/if}

                                <div class="flex items-center gap-3">
                                    <button
                                        type="button"
                                        class="btn preset-filled-primary-500"
                                        onclick={() => refineSkill(skill.path)}
                                        disabled={isRefining ||
                                            !feedbackText.trim()}
                                    >
                                        {#if isRefining}
                                            <span
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                                ></span>
                                                {i18n.t.skillReview.refining}
                                            </span>
                                        {:else}
                                            {i18n.t.skillReview.refineButton}
                                        {/if}
                                    </button>
                                </div>

                                {#if refineError}
                                    <div
                                        class="rounded-lg bg-error-500/10 p-3 text-sm text-error-500"
                                    >
                                        {refineError}
                                    </div>
                                {/if}

                                {#if refineSuccess}
                                    <div
                                        class="flex items-center gap-2 rounded-lg bg-success-500/10 p-3 text-sm text-success-600 dark:text-success-400 transition-opacity duration-300"
                                    >
                                        <span>✓</span>
                                        <span>{refineSuccess}</span>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}
