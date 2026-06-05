#include "server-manager.hpp"

#include <obs-module.h>

#ifdef _WIN32
#include <windows.h>
#include <filesystem>
#include <vector>
#endif

namespace chatterbox {

bool ServerManager::start(const std::string &data_dir)
{
	if (is_running())
		return true;

	data_dir_ = data_dir;

#ifdef _WIN32
	const std::filesystem::path server_script =
		std::filesystem::path(data_dir) / "chatterbox-server.cjs";

	if (!std::filesystem::exists(server_script)) {
		blog(LOG_ERROR,
		     "[chatterbox] server bundle missing: %s (run npm run build:plugin-data)",
		     server_script.string().c_str());
		return false;
	}

	std::string cmd = "node.exe \"" + server_script.string() + "\"";

	STARTUPINFOA si = {};
	si.cb = sizeof(si);
	si.dwFlags = STARTF_USESHOWWINDOW;
	si.wShowWindow = SW_HIDE;

	PROCESS_INFORMATION pi = {};

	char data_env[4096];
	snprintf(data_env, sizeof(data_env), "CHATTERBOX_DATA_DIR=%s",
		 data_dir.c_str());

	char *env_block = nullptr;
	// Inherit parent environment; child reads CHATTERBOX_DATA_DIR via SetEnvironmentVariable before CreateProcess
	SetEnvironmentVariableA("CHATTERBOX_DATA_DIR", data_dir.c_str());

	std::vector<char> cmd_line(cmd.begin(), cmd.end());
	cmd_line.push_back('\0');

	BOOL ok = CreateProcessA(
		nullptr, cmd_line.data(), nullptr, nullptr, FALSE,
		CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP, nullptr,
		data_dir.c_str(), &si, &pi);

	if (!ok) {
		blog(LOG_ERROR, "[chatterbox] failed to start server (is Node.js installed?)");
		return false;
	}

	process_handle_ = pi.hProcess;
	process_id_ = pi.dwProcessId;
	CloseHandle(pi.hThread);

	blog(LOG_INFO, "[chatterbox] server started (pid %lu)", process_id_);
	return true;
#else
	blog(LOG_ERROR, "[chatterbox] server auto-start is Windows-only in this build");
	return false;
#endif
}

void ServerManager::stop()
{
#ifdef _WIN32
	if (!process_handle_)
		return;

	TerminateProcess((HANDLE)process_handle_, 0);
	WaitForSingleObject((HANDLE)process_handle_, 5000);
	CloseHandle((HANDLE)process_handle_);
	process_handle_ = nullptr;
	process_id_ = 0;
	blog(LOG_INFO, "[chatterbox] server stopped");
#endif
}

bool ServerManager::is_running() const
{
#ifdef _WIN32
	if (!process_handle_)
		return false;
	DWORD code = 0;
	if (GetExitCodeProcess((HANDLE)process_handle_, &code)) {
		return code == STILL_ACTIVE;
	}
	return false;
#else
	return false;
#endif
}

std::string ServerManager::data_directory() const
{
	return data_dir_;
}

} // namespace chatterbox
