#pragma once

#include <string>

namespace chatterbox {

class ServerManager {
public:
	bool start(const std::string &data_dir);
	void stop();
	bool is_running() const;
	std::string data_directory() const;

private:
	std::string data_dir_;
#ifdef _WIN32
	void *process_handle_ = nullptr;
	unsigned long process_id_ = 0;
#endif
};

} // namespace chatterbox
