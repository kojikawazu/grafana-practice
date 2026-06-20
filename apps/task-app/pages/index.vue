<script setup lang="ts">
interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

const { data: tasks, refresh } = await useFetch<Task[]>("/api/tasks", {
  default: () => [],
});

const newTitle = ref("");
const errorMessage = ref("");
const busy = ref(false);

const canAdd = computed(() => newTitle.value.trim().length > 0 && !busy.value);

async function addTask() {
  if (!canAdd.value) return;
  errorMessage.value = "";
  busy.value = true;
  try {
    await $fetch("/api/tasks", {
      method: "POST",
      body: { title: newTitle.value },
    });
    newTitle.value = "";
    await refresh();
  } catch (e: any) {
    errorMessage.value = e?.statusMessage || "タスクの追加に失敗しました";
  } finally {
    busy.value = false;
  }
}

async function toggle(task: Task) {
  errorMessage.value = "";
  try {
    await $fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { done: !task.done },
    });
    await refresh();
  } catch (e: any) {
    errorMessage.value = e?.statusMessage || "更新に失敗しました";
  }
}

async function remove(task: Task) {
  errorMessage.value = "";
  try {
    await $fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    await refresh();
  } catch (e: any) {
    errorMessage.value = e?.statusMessage || "削除に失敗しました";
  }
}
</script>

<template>
  <main class="page">
    <h1>タスク管理 <small>（OpenTelemetry example）</small></h1>

    <form class="add" @submit.prevent="addTask">
      <input
        v-model="newTitle"
        type="text"
        placeholder="新しいタスクを入力"
        aria-label="新しいタスク"
      />
      <button type="submit" :disabled="!canAdd">追加</button>
    </form>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <ul class="list">
      <li v-for="task in tasks" :key="task.id" :class="{ done: task.done }">
        <label>
          <input
            type="checkbox"
            :checked="task.done"
            @change="toggle(task)"
          />
          <span class="title">{{ task.title }}</span>
        </label>
        <button class="del" type="button" @click="remove(task)">削除</button>
      </li>
      <li v-if="tasks.length === 0" class="empty">タスクはまだありません</li>
    </ul>
  </main>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 3rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  color: #1f2933;
}
h1 {
  font-size: 1.5rem;
}
h1 small {
  font-size: 0.8rem;
  color: #7b8794;
}
.add {
  display: flex;
  gap: 0.5rem;
  margin: 1.5rem 0;
}
.add input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd2d9;
  border-radius: 6px;
  font-size: 1rem;
}
.add button,
.del {
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1rem;
  cursor: pointer;
}
.add button {
  background: #2563eb;
  color: #fff;
}
.add button:disabled {
  background: #9fb3df;
  cursor: not-allowed;
}
.error {
  color: #b91c1c;
}
.list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e4e7eb;
  border-radius: 6px;
}
.list li.done .title {
  text-decoration: line-through;
  color: #9aa5b1;
}
.list label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}
.del {
  background: #f3f4f6;
  color: #b91c1c;
}
.empty {
  color: #9aa5b1;
  justify-content: center;
}
</style>
